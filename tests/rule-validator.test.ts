import { describe, expect, it } from 'vitest';
import { RuleValidator } from '../src/core/rule-validator';

function emptyBoard(): number[] {
  return new Array(81).fill(0);
}

describe('RuleValidator.conflictsAt', () => {
  it('detects a conflict in the same row', () => {
    const board = emptyBoard();
    board[0] = 5;
    board[3] = 5;
    const conflicts = RuleValidator.conflictsAt(board, 3);
    expect(conflicts).toContain(0);
    expect(conflicts).toHaveLength(1);
  });

  it('detects a conflict in the same column', () => {
    const board = emptyBoard();
    board[5] = 7;
    board[41] = 7;
    const conflicts = RuleValidator.conflictsAt(board, 41);
    expect(conflicts).toContain(5);
  });

  it('detects a conflict in the same box', () => {
    const board = emptyBoard();
    board[10] = 3;
    board[20] = 3;
    const conflicts = RuleValidator.conflictsAt(board, 20);
    expect(conflicts).toContain(10);
  });

  it('returns an empty list for an empty cell', () => {
    const board = emptyBoard();
    expect(RuleValidator.conflictsAt(board, 0)).toEqual([]);
  });

  it('does not report the cell itself', () => {
    const board = emptyBoard();
    board[0] = 5;
    expect(RuleValidator.conflictsAt(board, 0)).toEqual([]);
  });

  it('excludes cells with different values', () => {
    const board = emptyBoard();
    board[0] = 5;
    board[1] = 6;
    expect(RuleValidator.conflictsAt(board, 1)).toEqual([]);
  });
});

describe('RuleValidator.isCorrect', () => {
  it('compares the value against the solution', () => {
    const solution = Array.from({ length: 81 }, (_, i) => (i % 9) + 1);
    expect(RuleValidator.isCorrect(solution, 0, 1)).toBe(true);
    expect(RuleValidator.isCorrect(solution, 0, 2)).toBe(false);
  });
});

describe('RuleValidator.isComplete', () => {
  it('is true only when the board fully matches the solution', () => {
    const solution = Array.from({ length: 81 }, (_, i) => (i % 9) + 1);
    expect(RuleValidator.isComplete(solution.slice(), solution)).toBe(true);
    const partial = solution.slice();
    partial[0] = 0;
    expect(RuleValidator.isComplete(partial, solution)).toBe(false);
    const wrong = solution.slice();
    wrong[0] = 2;
    expect(RuleValidator.isComplete(wrong, solution)).toBe(false);
  });
});
