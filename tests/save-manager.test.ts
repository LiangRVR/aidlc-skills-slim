import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/event-bus';
import { GameState } from '../src/core/game-state';
import { SudokuGenerator } from '../shared/sudoku-generator';
import { SaveManager } from '../src/persistence/save-manager';
import type { GameSave } from '../src/core/types';

const SAVE_KEY = 'sudoku-game-save';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('SaveManager', () => {
  let manager: SaveManager;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    manager = new SaveManager();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeSave(): GameSave {
    const puzzle = SudokuGenerator.generate('easy');
    return {
      version: 1,
      difficulty: 'easy',
      givens: puzzle.givens,
      solution: puzzle.solution,
      board: puzzle.givens.slice(),
      notes: Array.from({ length: 81 }, () => [] as number[]),
      mistakes: 0,
      elapsedSeconds: 10,
      history: [],
      status: 'playing',
    };
  }

  it('saves and loads a valid save unchanged', () => {
    const save = makeSave();
    manager.save(save);
    expect(manager.hasSave()).toBe(true);
    const loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.difficulty).toBe('easy');
    expect(loaded!.board).toEqual(save.board);
    expect(loaded!.solution).toEqual(save.solution);
    expect(loaded!.elapsedSeconds).toBe(10);
    expect(loaded!.status).toBe('playing');
  });

  it('returns null when nothing is stored', () => {
    expect(manager.hasSave()).toBe(false);
    expect(manager.load()).toBeNull();
  });

  it('returns null for corrupted JSON', () => {
    storage.setItem(SAVE_KEY, '{not valid json');
    expect(manager.load()).toBeNull();
  });

  it('returns null when the version does not match', () => {
    const save = makeSave();
    save.version = 999;
    manager.save(save);
    expect(manager.load()).toBeNull();
  });

  it('returns null when the board structure is invalid', () => {
    const save = makeSave();
    save.board = new Array(80).fill(0);
    manager.save(save);
    expect(manager.load()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, difficulty: 'easy' }));
    expect(manager.load()).toBeNull();
  });

  it('returns null when mistakes exceed the allowed range', () => {
    const save = makeSave();
    save.mistakes = 7;
    manager.save(save);
    expect(manager.load()).toBeNull();
  });

  it('clear removes the stored save', () => {
    manager.save(makeSave());
    manager.clear();
    expect(manager.hasSave()).toBe(false);
    expect(manager.load()).toBeNull();
  });

  it('round-trips a save produced by GameState', () => {
    const puzzle = SudokuGenerator.generate('easy');
    const state = new GameState(puzzle, 'easy', new EventBus());
    const save = state.toSave();
    manager.save(save);
    const loaded = manager.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.board).toEqual(save.board);
    expect(loaded!.history).toEqual(save.history);
  });
});
