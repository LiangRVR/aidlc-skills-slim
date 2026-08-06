import { describe, expect, it } from 'vitest';
import { SudokuSolver } from '../src/core/sudoku-solver';

const PUZZLE = '..9748...7.........2.1.9.....7...24..64.1.59..98...3.....8.3.2.........6...2759..';

function parseGrid(text: string): number[] {
  return [...text].map((ch) => (ch === '.' ? 0 : Number(ch)));
}

function unsolvableGrid(): number[] {
  const grid = new Array(81).fill(0);
  for (let i = 0; i < 9; i++) {
    grid[i] = i + 1;
    grid[i * 9] = i + 1;
  }
  return grid;
}

function isValidSolution(grid: number[]): boolean {
  if (grid.length !== 81) return false;
  for (let i = 0; i < 81; i++) {
    if (grid[i] < 1 || grid[i] > 9) return false;
  }
  for (let r = 0; r < 9; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < 9; c++) seen.add(grid[r * 9 + c]);
    if (seen.size !== 9) return false;
  }
  for (let c = 0; c < 9; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < 9; r++) seen.add(grid[r * 9 + c]);
    if (seen.size !== 9) return false;
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Set<number>();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) seen.add(grid[(br * 3 + r) * 9 + (bc * 3 + c)]);
      }
      if (seen.size !== 9) return false;
    }
  }
  return true;
}

describe('SudokuSolver.solve', () => {
  it('solves an empty grid to a valid full solution', () => {
    const grid = new Array(81).fill(0);
    const solution = SudokuSolver.solve(grid);
    expect(solution).not.toBeNull();
    expect(isValidSolution(solution!)).toBe(true);
  });

  it('solves a known puzzle and keeps every given cell', () => {
    const grid = parseGrid(PUZZLE);
    const solution = SudokuSolver.solve(grid);
    expect(solution).not.toBeNull();
    expect(isValidSolution(solution!)).toBe(true);
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) expect(solution![i]).toBe(grid[i]);
    }
  });

  it('returns null for an unsolvable grid', () => {
    const grid = unsolvableGrid();
    expect(SudokuSolver.solve(grid)).toBeNull();
  });
});

describe('SudokuSolver.countSolutions', () => {
  it('reaches the limit for an empty grid', () => {
    const grid = new Array(81).fill(0);
    expect(SudokuSolver.countSolutions(grid, 2)).toBe(2);
  });

  it('returns 1 for a uniquely solvable grid', () => {
    const grid = parseGrid(PUZZLE);
    expect(SudokuSolver.countSolutions(grid, 2)).toBe(1);
  });

  it('returns 0 for an unsolvable grid', () => {
    const grid = unsolvableGrid();
    expect(SudokuSolver.countSolutions(grid, 2)).toBe(0);
  });

  it('stops counting once the limit is reached', () => {
    const grid = new Array(81).fill(0);
    expect(SudokuSolver.countSolutions(grid, 1)).toBe(1);
  });
});

describe('SudokuSolver.findHint', () => {
  it('returns an empty cell paired with its solution value', () => {
    const grid = parseGrid(PUZZLE);
    const solution = SudokuSolver.solve(grid)!;
    const hint = SudokuSolver.findHint(grid, solution);
    expect(hint).not.toBeNull();
    expect(grid[hint!.index]).toBe(0);
    expect(hint!.value).toBe(solution[hint!.index]);
  });

  it('returns null when no empty cell exists', () => {
    const full = Array.from({ length: 81 }, (_, i) => (i % 9) + 1);
    expect(SudokuSolver.findHint(full, full)).toBeNull();
  });
});
