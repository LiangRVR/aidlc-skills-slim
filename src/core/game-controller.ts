import { EventBus } from './event-bus';
import { GameState } from './game-state';
import { SudokuGenerator } from './sudoku-generator';
import { SaveManager } from '../persistence/save-manager';
import type { CellIndex, CellValue, Difficulty, GameSave } from './types';

const AUTOSAVE_INTERVAL_SECONDS = 5;

export interface ControllerCapabilities {
  hint: boolean;
  reset: boolean;
  newGame: boolean;
}

export interface IGameController {
  getState(): GameState | null;
  getBus(): EventBus;
  newGame(difficulty: Difficulty): void;
  continueGame(save: GameSave): void;
  inputDigit(value: CellValue): { index: CellIndex; result: 'correct' | 'wrong' | 'ignored' | 'note' } | null;
  erase(): void;
  undo(): void;
  redo(): void;
  hint(): void;
  reset(): void;
  toggleNoteMode(): void;
  selectCell(index: CellIndex | null): void;
  tick(seconds: number): void;
  isReadOnly(): boolean;
  capabilities(): ControllerCapabilities;
}

export class LocalGameController implements IGameController {
  private readonly bus: EventBus;
  private readonly saveManager = new SaveManager();
  private state: GameState | null = null;
  private tickSinceSave = 0;

  constructor(bus: EventBus = new EventBus()) {
    this.bus = bus;
  }

  getState(): GameState | null {
    return this.state;
  }

  getBus(): EventBus {
    return this.bus;
  }

  newGame(difficulty: Difficulty): void {
    this.saveManager.clear();
    this.state = new GameState(SudokuGenerator.generate(difficulty), difficulty, this.bus);
    this.tickSinceSave = 0;
    this.wire();
  }

  continueGame(save: GameSave): void {
    this.state = GameState.fromSave(save, this.bus);
    this.tickSinceSave = 0;
    this.wire();
  }

  inputDigit(value: CellValue): { index: CellIndex; result: 'correct' | 'wrong' | 'ignored' | 'note' } | null {
    const state = this.state;
    if (!state || state.getStatus() !== 'playing') return null;
    const index = state.getSelectedIndex();
    if (index === null || value < 1 || value > 9) return null;
    if (state.getNoteMode()) {
      if (state.toggleNote(index, value)) this.autosave();
      return { index, result: 'note' };
    }
    const result = state.fill(index, value);
    if (result !== 'ignored') this.autosave();
    return { index, result };
  }

  erase(): void {
    const state = this.state;
    if (!state) return;
    const index = state.getSelectedIndex();
    if (index === null) return;
    if (state.erase(index)) this.autosave();
  }

  undo(): void {
    if (this.state?.undo()) this.autosave();
  }

  redo(): void {
    if (this.state?.redo()) this.autosave();
  }

  hint(): void {
    if (this.state?.applyHint() !== null) this.autosave();
  }

  reset(): void {
    this.state?.reset();
    this.tickSinceSave = 0;
  }

  toggleNoteMode(): void {
    const state = this.state;
    if (state) state.setNoteMode(!state.getNoteMode());
  }

  selectCell(index: CellIndex | null): void {
    this.state?.selectCell(index);
  }

  tick(seconds: number): void {
    const state = this.state;
    if (!state) return;
    state.tick(seconds);
    this.tickSinceSave += seconds;
    if (this.tickSinceSave >= AUTOSAVE_INTERVAL_SECONDS) {
      this.tickSinceSave = 0;
      this.autosave();
    }
  }

  isReadOnly(): boolean {
    return false;
  }

  capabilities(): ControllerCapabilities {
    return { hint: true, reset: true, newGame: true };
  }

  private wire(): void {
    this.state?.setClearSaveHandler(() => this.saveManager.clear());
  }

  private autosave(): void {
    const state = this.state;
    if (!state || state.getStatus() !== 'playing') return;
    this.saveManager.save(state.toSave());
  }
}
