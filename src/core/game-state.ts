import { EventBus } from './event-bus';
import { RuleValidator } from '../../shared/rule-validator';
import { SudokuSolver } from '../../shared/sudoku-solver';
import {
  EVENTS,
  MAX_MISTAKES,
  SAVE_VERSION,
  type CellIndex,
  type CellValue,
  type Difficulty,
  type GameSave,
  type GameStatus,
  type Move,
  type Puzzle,
} from './types';

const CELLS = 81;

export class GameState {
  private readonly puzzle: Puzzle;
  private readonly difficulty: Difficulty;
  private readonly bus: EventBus;
  private board: CellValue[];
  private notes: Set<number>[];
  private isGiven: boolean[];
  private selectedIndex: CellIndex | null = null;
  private noteMode = false;
  private mistakes = 0;
  private status: GameStatus = 'playing';
  private elapsedSeconds = 0;
  private undoStack: Move[] = [];
  private redoStack: Move[] = [];
  private clearSaveHandler: (() => void) | null = null;

  constructor(puzzle: Puzzle, difficulty: Difficulty, bus: EventBus) {
    this.puzzle = puzzle;
    this.difficulty = difficulty;
    this.bus = bus;
    this.board = puzzle.givens.slice();
    this.notes = Array.from({ length: CELLS }, () => new Set<number>());
    this.isGiven = puzzle.givens.map((v) => v !== 0);
  }

  setClearSaveHandler(handler: () => void): void {
    this.clearSaveHandler = handler;
  }

  getPuzzle(): Puzzle {
    return this.puzzle;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getBoard(): CellValue[] {
    return this.board.slice();
  }

  getNotes(): number[][] {
    return this.notes.map((n) => [...n].sort((a, b) => a - b));
  }

  getNoteMode(): boolean {
    return this.noteMode;
  }

  getSelectedIndex(): CellIndex | null {
    return this.selectedIndex;
  }

  getMistakes(): number {
    return this.mistakes;
  }

  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  isGivenCell(index: CellIndex): boolean {
    return this.isGiven[index];
  }

  canUndo(): boolean {
    return this.status === 'playing' && this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.status === 'playing' && this.redoStack.length > 0;
  }

  selectCell(index: CellIndex | null): void {
    this.selectedIndex = index;
    this.bus.emit(EVENTS.STATE_CHANGED);
  }

  fill(index: CellIndex, value: CellValue): 'correct' | 'wrong' | 'ignored' {
    if (this.status !== 'playing') return 'ignored';
    if (this.isGiven[index] || value === 0) return 'ignored';
    if (this.board[index] === value) return 'ignored';
    const prevValue = this.board[index];
    const prevNotes = this.cellNotes(index);
    const correct = value === this.puzzle.solution[index];
    const clearedPeerNotes: { index: CellIndex; value: CellValue }[] = [];
    if (correct) {
      for (const peer of this.peersOf(index)) {
        if (this.board[peer] === 0 && this.notes[peer].delete(value)) {
          clearedPeerNotes.push({ index: peer, value });
        }
      }
    }
    this.board[index] = value;
    this.notes[index].clear();
    const mistakesDelta = correct ? 0 : 1;
    if (!correct) {
      this.mistakes += 1;
      this.bus.emit(EVENTS.MISTAKES_CHANGED, this.mistakes);
    }
    this.pushMove({
      type: 'fill',
      index,
      prevValue,
      nextValue: value,
      prevNotes,
      nextNotes: [],
      clearedPeerNotes,
      mistakesDelta,
    });
    this.afterBoardChange(index);
    if (!correct && this.mistakes >= MAX_MISTAKES) {
      this.status = 'lost';
      this.bus.emit(EVENTS.GAME_LOST);
      this.clearSaveHandler?.();
    } else if (correct && this.isComplete()) {
      this.status = 'won';
      this.bus.emit(EVENTS.GAME_WON);
      this.clearSaveHandler?.();
    }
    return correct ? 'correct' : 'wrong';
  }

  erase(index: CellIndex): boolean {
    if (this.status !== 'playing') return false;
    if (this.isGiven[index] || this.board[index] === 0) return false;
    const prevValue = this.board[index];
    this.board[index] = 0;
    this.notes[index].clear();
    this.pushMove({
      type: 'erase',
      index,
      prevValue,
      nextValue: 0,
      prevNotes: [],
      nextNotes: [],
      clearedPeerNotes: [],
      mistakesDelta: 0,
    });
    this.afterBoardChange(index);
    return true;
  }

  toggleNote(index: CellIndex, value: CellValue): boolean {
    if (this.status !== 'playing') return false;
    if (this.isGiven[index] || this.board[index] !== 0) return false;
    const prevNotes = this.cellNotes(index);
    if (this.notes[index].has(value)) {
      this.notes[index].delete(value);
    } else {
      this.notes[index].add(value);
    }
    this.pushMove({
      type: 'note',
      index,
      prevValue: 0,
      nextValue: 0,
      prevNotes,
      nextNotes: this.cellNotes(index),
      clearedPeerNotes: [],
      mistakesDelta: 0,
    });
    this.bus.emit(EVENTS.STATE_CHANGED);
    return true;
  }

  setNoteMode(on: boolean): void {
    if (this.noteMode === on) return;
    this.noteMode = on;
    this.bus.emit(EVENTS.NOTE_MODE_CHANGED, on);
  }

  undo(): boolean {
    if (this.status !== 'playing') return false;
    const move = this.undoStack.pop();
    if (!move) return false;
    this.applyReverse(move);
    this.redoStack.push(move);
    this.afterBoardChange(move.index);
    return true;
  }

  redo(): boolean {
    if (this.status !== 'playing') return false;
    const move = this.redoStack.pop();
    if (!move) return false;
    this.applyForward(move);
    this.undoStack.push(move);
    this.afterBoardChange(move.index);
    return true;
  }

  applyHint(): { index: CellIndex; value: CellValue } | null {
    if (this.status !== 'playing') return null;
    const hint = SudokuSolver.findHint(this.board, this.puzzle.solution);
    if (!hint) return null;
    const { index, value } = hint;
    const prevNotes = this.cellNotes(index);
    const clearedPeerNotes: { index: CellIndex; value: CellValue }[] = [];
    for (const peer of this.peersOf(index)) {
      if (this.board[peer] === 0 && this.notes[peer].delete(value)) {
        clearedPeerNotes.push({ index: peer, value });
      }
    }
    this.board[index] = value;
    this.notes[index].clear();
    this.isGiven[index] = true;
    this.pushMove({
      type: 'hint',
      index,
      prevValue: 0,
      nextValue: value,
      prevNotes,
      nextNotes: [],
      clearedPeerNotes,
      mistakesDelta: 0,
    });
    this.afterBoardChange(index);
    if (this.isComplete()) {
      this.status = 'won';
      this.bus.emit(EVENTS.GAME_WON);
      this.clearSaveHandler?.();
    }
    return { index, value };
  }

  reset(): void {
    this.board = this.puzzle.givens.slice();
    this.notes = Array.from({ length: CELLS }, () => new Set<number>());
    this.isGiven = this.puzzle.givens.map((v) => v !== 0);
    this.selectedIndex = null;
    this.mistakes = 0;
    this.status = 'playing';
    this.elapsedSeconds = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.bus.emit(EVENTS.MISTAKES_CHANGED, 0);
    this.bus.emit(EVENTS.STATE_CHANGED);
    this.bus.emit(EVENTS.CONFLICT_UPDATED, []);
    this.clearSaveHandler?.();
  }

  tick(seconds: number): void {
    if (this.status !== 'playing') return;
    this.elapsedSeconds += seconds;
    this.bus.emit(EVENTS.TIMER_TICK, this.elapsedSeconds);
  }

  toSave(): GameSave {
    return {
      version: SAVE_VERSION,
      difficulty: this.difficulty,
      givens: this.puzzle.givens.slice(),
      solution: this.puzzle.solution.slice(),
      board: this.board.slice(),
      notes: this.getNotes(),
      mistakes: this.mistakes,
      elapsedSeconds: this.elapsedSeconds,
      history: this.undoStack.map((m) => this.cloneMove(m)),
      status: this.status,
    };
  }

  static fromSave(save: GameSave, bus: EventBus): GameState {
    const state = new GameState(
      { givens: save.givens.slice(), solution: save.solution.slice() },
      save.difficulty,
      bus,
    );
    state.board = save.board.slice();
    state.notes = save.notes.map((n) => new Set(n));
    state.mistakes = save.mistakes;
    state.elapsedSeconds = save.elapsedSeconds;
    state.status = save.status;
    state.undoStack = save.history.map((m) => state.cloneMove(m));
    return state;
  }

  private cellNotes(index: CellIndex): number[] {
    return [...this.notes[index]].sort((a, b) => a - b);
  }

  private peersOf(index: CellIndex): CellIndex[] {
    const result: CellIndex[] = [];
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let c = 0; c < 9; c++) {
      const peer = row * 9 + c;
      if (peer !== index) result.push(peer);
    }
    for (let r = 0; r < 9; r++) {
      const peer = r * 9 + col;
      if (peer !== index) result.push(peer);
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        const peer = r * 9 + c;
        if (peer !== index) result.push(peer);
      }
    }
    return result;
  }

  private pushMove(move: Move): void {
    this.undoStack.push(move);
    this.redoStack = [];
  }

  private afterBoardChange(index: CellIndex): void {
    this.bus.emit(EVENTS.STATE_CHANGED);
    this.bus.emit(EVENTS.CONFLICT_UPDATED, RuleValidator.conflictsAt(this.board, index));
  }

  private isComplete(): boolean {
    return RuleValidator.isComplete(this.board, this.puzzle.solution);
  }

  private cloneMove(move: Move): Move {
    return {
      ...move,
      prevNotes: [...move.prevNotes],
      nextNotes: [...move.nextNotes],
      clearedPeerNotes: move.clearedPeerNotes.map((c) => ({ ...c })),
    };
  }

  private applyReverse(move: Move): void {
    this.board[move.index] = move.prevValue;
    this.notes[move.index] = new Set(move.prevNotes);
    if (move.type === 'hint') {
      this.isGiven[move.index] = false;
    }
    for (const cleared of move.clearedPeerNotes) {
      this.notes[cleared.index].add(cleared.value);
    }
    this.mistakes -= move.mistakesDelta;
    if (move.mistakesDelta !== 0) {
      this.bus.emit(EVENTS.MISTAKES_CHANGED, this.mistakes);
    }
  }

  private applyForward(move: Move): void {
    this.board[move.index] = move.nextValue;
    this.notes[move.index] = new Set(move.nextNotes);
    if (move.type === 'hint') {
      this.isGiven[move.index] = true;
    }
    for (const cleared of move.clearedPeerNotes) {
      this.notes[cleared.index].delete(cleared.value);
    }
    this.mistakes += move.mistakesDelta;
    if (move.mistakesDelta !== 0) {
      this.bus.emit(EVENTS.MISTAKES_CHANGED, this.mistakes);
    }
  }
}
