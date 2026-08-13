import { describe, expect, it } from 'vitest';
import { SudokuGenerator } from '../shared/sudoku-generator';
import { SudokuSolver } from '../shared/sudoku-solver';
import type { Difficulty, Puzzle } from '../src/core/types';

const GIVEN_RANGES: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  medium: [32, 39],
  hard: [26, 31],
  expert: [22, 25],
};

function countGivens(puzzle: Puzzle): number {
  return puzzle.givens.filter((v) => v !== 0).length;
}

describe('SudokuGenerator.generate', () => {
  it.each<Difficulty>(['easy', 'medium', 'hard', 'expert'])('%s puzzles have exactly one solution', (difficulty) => {
    const puzzle = SudokuGenerator.generate(difficulty);
    expect(SudokuSolver.countSolutions(puzzle.givens, 2)).toBe(1);
  });

  it.each<Difficulty>(['easy', 'medium', 'hard', 'expert'])('%s puzzles stay within the given-count range', (difficulty) => {
    const [min, max] = GIVEN_RANGES[difficulty];
    for (let i = 0; i < 5; i++) {
      const puzzle = SudokuGenerator.generate(difficulty);
      const count = countGivens(puzzle);
      expect(count).toBeGreaterThanOrEqual(min);
      expect(count).toBeLessThanOrEqual(max);
    }
  });

  it('produces a complete solution consistent with the givens', () => {
    const puzzle = SudokuGenerator.generate('medium');
    expect(puzzle.solution.length).toBe(81);
    for (let i = 0; i < 81; i++) {
      expect(puzzle.solution[i]).toBeGreaterThanOrEqual(1);
      expect(puzzle.solution[i]).toBeLessThanOrEqual(9);
      if (puzzle.givens[i] !== 0) expect(puzzle.solution[i]).toBe(puzzle.givens[i]);
    }
  });

  it('digs holes symmetrically (index i pairs with 80 - i)', () => {
    for (let round = 0; round < 3; round++) {
      const puzzle = SudokuGenerator.generate('hard');
      for (let i = 0; i < 81; i++) {
        expect(puzzle.givens[i] === 0).toBe(puzzle.givens[80 - i] === 0);
      }
    }
  });
});
