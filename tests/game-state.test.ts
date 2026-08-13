import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/event-bus';
import { GameState } from '../src/core/game-state';
import { SudokuGenerator } from '../shared/sudoku-generator';
import { EVENTS, MAX_MISTAKES } from '../src/core/types';
import type { CellIndex, CellValue, GameSave, Puzzle } from '../src/core/types';

function createPuzzle(): Puzzle {
  return SudokuGenerator.generate('easy');
}

function emptyCells(givens: CellValue[]): CellIndex[] {
  const result: CellIndex[] = [];
  for (let i = 0; i < 81; i++) {
    if (givens[i] === 0) result.push(i);
  }
  return result;
}

function wrongValueFor(solution: CellValue[], index: CellIndex): CellValue {
  return solution[index] === 9 ? 8 : solution[index] + 1;
}

describe('GameState', () => {
  let puzzle: Puzzle;
  let bus: EventBus;
  let state: GameState;
  let events: string[];

  beforeEach(() => {
    puzzle = createPuzzle();
    bus = new EventBus();
    state = new GameState(puzzle, 'easy', bus);
    events = [];
    for (const event of Object.values(EVENTS)) {
      bus.on(event, () => events.push(event));
    }
  });

  it('fills a correct value, clears the cell notes and keeps mistakes at zero', () => {
    const index = emptyCells(puzzle.givens)[0];
    const value = puzzle.solution[index];
    state.toggleNote(index, 3);
    expect(state.fill(index, value)).toBe('correct');
    expect(state.getBoard()[index]).toBe(value);
    expect(state.getNotes()[index]).toEqual([]);
    expect(state.getMistakes()).toBe(0);
    expect(state.getStatus()).toBe('playing');
    expect(events).toContain(EVENTS.STATE_CHANGED);
    expect(events).toContain(EVENTS.CONFLICT_UPDATED);
  });

  it('ignores filling the same value again', () => {
    const index = emptyCells(puzzle.givens)[0];
    state.fill(index, puzzle.solution[index]);
    expect(state.fill(index, puzzle.solution[index])).toBe('ignored');
    expect(state.canUndo()).toBe(true);
  });

  it('keeps a wrong value in the cell and increments mistakes', () => {
    const index = emptyCells(puzzle.givens)[0];
    const wrong = wrongValueFor(puzzle.solution, index);
    expect(state.fill(index, wrong)).toBe('wrong');
    expect(state.getBoard()[index]).toBe(wrong);
    expect(state.getMistakes()).toBe(1);
    expect(events).toContain(EVENTS.MISTAKES_CHANGED);
  });

  it('rejects fill, erase and notes on given cells', () => {
    const givenIndex = puzzle.givens.findIndex((v) => v !== 0);
    expect(state.fill(givenIndex, 1)).toBe('ignored');
    expect(state.erase(givenIndex)).toBe(false);
    expect(state.toggleNote(givenIndex, 1)).toBe(false);
  });

  it('emits conflict:updated with the conflicting peer index', () => {
    const solution = Array.from({ length: 81 }, (_, i) => (i % 9) + 1);
    const crafted = new GameState({ givens: new Array(81).fill(0), solution }, 'easy', bus);
    let payload: CellIndex[] | undefined;
    bus.on(EVENTS.CONFLICT_UPDATED, (p) => {
      payload = p as CellIndex[];
    });
    expect(crafted.fill(0, 1)).toBe('correct');
    expect(crafted.fill(1, 1)).toBe('wrong');
    expect(payload).toContain(0);
  });

  it('toggles notes in note mode without touching mistakes', () => {
    const index = emptyCells(puzzle.givens)[0];
    state.setNoteMode(true);
    expect(state.getNoteMode()).toBe(true);
    expect(state.toggleNote(index, 5)).toBe(true);
    expect(state.getNotes()[index]).toEqual([5]);
    expect(state.toggleNote(index, 5)).toBe(true);
    expect(state.getNotes()[index]).toEqual([]);
    state.setNoteMode(false);
    state.setNoteMode(false);
    expect(state.getMistakes()).toBe(0);
    expect(state.getStatus()).toBe('playing');
    expect(events.filter((e) => e === EVENTS.NOTE_MODE_CHANGED)).toHaveLength(2);
    expect(events.filter((e) => e === EVENTS.MISTAKES_CHANGED)).toHaveLength(0);
    expect(events.filter((e) => e === EVENTS.CONFLICT_UPDATED)).toHaveLength(0);
  });

  it('rejects notes on filled cells', () => {
    const index = emptyCells(puzzle.givens)[0];
    state.fill(index, puzzle.solution[index]);
    expect(state.toggleNote(index, 5)).toBe(false);
  });

  it('auto-clears peer notes when a correct value is filled', () => {
    for (const i of emptyCells(puzzle.givens)) {
      const v = puzzle.solution[i];
      const row = Math.floor(i / 9);
      const peer = emptyCells(puzzle.givens).find(
        (c) => c !== i && (Math.floor(c / 9) === row || c % 9 === i % 9),
      );
      if (peer === undefined) continue;
      state.toggleNote(peer, v);
      expect(state.fill(i, v)).toBe('correct');
      expect(state.getNotes()[peer]).not.toContain(v);
      return;
    }
    throw new Error('no empty peer pair found');
  });

  it('undo and redo restore values, notes, peer notes and mistakes', () => {
    const empties = emptyCells(puzzle.givens);
    for (const i of empties) {
      const peer = empties.find((c) => c !== i && Math.floor(c / 9) === Math.floor(i / 9));
      if (peer === undefined) continue;
      const v = puzzle.solution[i];
      state.toggleNote(peer, v);
      state.fill(i, v);
      expect(state.getBoard()[i]).toBe(v);
      expect(state.getNotes()[peer]).not.toContain(v);
      expect(state.undo()).toBe(true);
      expect(state.getBoard()[i]).toBe(0);
      expect(state.getNotes()[peer]).toContain(v);
      expect(state.getNotes()[i]).toEqual([]);
      expect(state.redo()).toBe(true);
      expect(state.getBoard()[i]).toBe(v);
      expect(state.getNotes()[peer]).not.toContain(v);
      return;
    }
    throw new Error('no same-row empty peer pair found');
  });

  it('undo restores the mistakes count', () => {
    const i = emptyCells(puzzle.givens)[0];
    state.fill(i, wrongValueFor(puzzle.solution, i));
    expect(state.getMistakes()).toBe(1);
    expect(state.undo()).toBe(true);
    expect(state.getMistakes()).toBe(0);
    expect(state.redo()).toBe(true);
    expect(state.getMistakes()).toBe(1);
  });

  it('a new operation clears the redo stack', () => {
    const empties = emptyCells(puzzle.givens);
    state.fill(empties[0], puzzle.solution[empties[0]]);
    state.undo();
    expect(state.canRedo()).toBe(true);
    state.toggleNote(empties[1], 3);
    expect(state.canRedo()).toBe(false);
    expect(state.redo()).toBe(false);
  });

  it('undo and redo are no-ops on an empty history', () => {
    expect(state.undo()).toBe(false);
    expect(state.redo()).toBe(false);
  });

  it('locks the board after MAX_MISTAKES mistakes and emits game:lost', () => {
    const empties = emptyCells(puzzle.givens);
    let lostCount = 0;
    bus.on(EVENTS.GAME_LOST, () => lostCount++);
    for (let k = 0; k < MAX_MISTAKES; k++) {
      expect(state.fill(empties[k], wrongValueFor(puzzle.solution, empties[k]))).toBe('wrong');
    }
    expect(state.getMistakes()).toBe(MAX_MISTAKES);
    expect(state.getStatus()).toBe('lost');
    expect(lostCount).toBe(1);
    expect(state.fill(empties[3], puzzle.solution[empties[3]])).toBe('ignored');
    expect(state.toggleNote(empties[3], 1)).toBe(false);
    expect(state.erase(empties[3])).toBe(false);
    expect(state.undo()).toBe(false);
    expect(state.redo()).toBe(false);
  });

  it('wins when the board is fully and correctly filled and stops the timer', () => {
    const empties = emptyCells(puzzle.givens);
    let wonCount = 0;
    bus.on(EVENTS.GAME_WON, () => wonCount++);
    for (const i of empties) {
      state.fill(i, puzzle.solution[i]);
    }
    expect(state.getStatus()).toBe('won');
    expect(wonCount).toBe(1);
    expect(state.fill(empties[0], 1)).toBe('ignored');
    state.tick(10);
    expect(state.getElapsedSeconds()).toBe(0);
  });

  it('erase removes user-filled values only', () => {
    const empties = emptyCells(puzzle.givens);
    const i = empties[0];
    state.fill(i, puzzle.solution[i]);
    expect(state.erase(i)).toBe(true);
    expect(state.getBoard()[i]).toBe(0);
    expect(state.erase(i)).toBe(false);
    state.fill(i, wrongValueFor(puzzle.solution, i));
    expect(state.erase(i)).toBe(true);
    expect(state.getMistakes()).toBe(1);
  });

  it('applyHint fills the solution value and locks the cell', () => {
    const hint = state.applyHint();
    expect(hint).not.toBeNull();
    expect(hint!.value).toBe(puzzle.solution[hint!.index]);
    expect(state.getBoard()[hint!.index]).toBe(hint!.value);
    expect(state.isGivenCell(hint!.index)).toBe(true);
    expect(state.getMistakes()).toBe(0);
    expect(state.fill(hint!.index, 1)).toBe('ignored');
    expect(state.erase(hint!.index)).toBe(false);
    expect(state.toggleNote(hint!.index, 1)).toBe(false);
    expect(events).toContain(EVENTS.STATE_CHANGED);
  });

  it('undoing a hint unlocks the cell again', () => {
    const hint = state.applyHint()!;
    expect(state.undo()).toBe(true);
    expect(state.getBoard()[hint.index]).toBe(0);
    expect(state.isGivenCell(hint.index)).toBe(false);
    expect(state.fill(hint.index, puzzle.solution[hint.index])).toBe('correct');
  });

  it('applyHint returns null when no empty cell exists', () => {
    const empties = emptyCells(puzzle.givens);
    state.fill(empties[0], wrongValueFor(puzzle.solution, empties[0]));
    for (let k = 1; k < empties.length; k++) {
      state.fill(empties[k], puzzle.solution[empties[k]]);
    }
    expect(state.getStatus()).toBe('playing');
    expect(state.applyHint()).toBeNull();
  });

  it('reset restores the initial puzzle and clears history and the save', () => {
    const empties = emptyCells(puzzle.givens);
    state.fill(empties[0], puzzle.solution[empties[0]]);
    state.fill(empties[1], wrongValueFor(puzzle.solution, empties[1]));
    state.tick(30);
    let cleared = 0;
    state.setClearSaveHandler(() => cleared++);
    state.reset();
    expect(cleared).toBe(1);
    expect(state.getBoard()).toEqual(puzzle.givens);
    expect(state.getMistakes()).toBe(0);
    expect(state.getElapsedSeconds()).toBe(0);
    expect(state.getStatus()).toBe('playing');
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);
  });

  it('invokes the clear-save handler on win and loss', () => {
    let cleared = 0;
    state.setClearSaveHandler(() => cleared++);
    for (const i of emptyCells(puzzle.givens)) {
      state.fill(i, puzzle.solution[i]);
    }
    expect(cleared).toBe(1);
    const second = new GameState(createPuzzle(), 'easy', bus);
    second.setClearSaveHandler(() => cleared++);
    for (let k = 0; k < MAX_MISTAKES; k++) {
      const empties = emptyCells(second.getPuzzle().givens);
      second.fill(empties[k], wrongValueFor(second.getPuzzle().solution, empties[k]));
    }
    expect(cleared).toBe(2);
  });

  it('tick accumulates elapsed time only while playing', () => {
    let lastPayload: unknown;
    bus.on(EVENTS.TIMER_TICK, (p) => {
      lastPayload = p;
    });
    state.tick(1);
    state.tick(4);
    expect(state.getElapsedSeconds()).toBe(5);
    expect(lastPayload).toBe(5);
    for (const i of emptyCells(puzzle.givens)) {
      state.fill(i, puzzle.solution[i]);
    }
    state.tick(10);
    expect(state.getElapsedSeconds()).toBe(5);
  });

  it('selectCell updates the selected index', () => {
    state.selectCell(5);
    expect(state.getSelectedIndex()).toBe(5);
    state.selectCell(null);
    expect(state.getSelectedIndex()).toBeNull();
  });

  it('toSave and fromSave round-trip the full state', () => {
    const empties = emptyCells(puzzle.givens);
    state.fill(empties[0], puzzle.solution[empties[0]]);
    state.toggleNote(empties[1], 5);
    state.fill(empties[2], wrongValueFor(puzzle.solution, empties[2]));
    state.tick(12);
    const save: GameSave = state.toSave();
    expect(save.version).toBe(1);
    expect(save.history).toHaveLength(3);
    const restored = GameState.fromSave(save, new EventBus());
    expect(restored.getBoard()).toEqual(state.getBoard());
    expect(restored.getNotes()).toEqual(state.getNotes());
    expect(restored.getMistakes()).toBe(state.getMistakes());
    expect(restored.getElapsedSeconds()).toBe(12);
    expect(restored.getStatus()).toBe('playing');
    expect(restored.canUndo()).toBe(true);
    expect(restored.undo()).toBe(true);
    expect(restored.getBoard()[empties[2]]).toBe(0);
    expect(restored.getMistakes()).toBe(0);
  });

  it('fromSave restores a lost status', () => {
    const empties = emptyCells(puzzle.givens);
    for (let k = 0; k < MAX_MISTAKES; k++) {
      state.fill(empties[k], wrongValueFor(puzzle.solution, empties[k]));
    }
    const restored = GameState.fromSave(state.toSave(), new EventBus());
    expect(restored.getStatus()).toBe('lost');
    expect(restored.getMistakes()).toBe(MAX_MISTAKES);
  });
});
