import type { CellIndex, CellValue } from './types';

const SIZE = 9;
const CELLS = SIZE * SIZE;

function candidatesAt(board: CellValue[], index: CellIndex): CellValue[] {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const used = new Set<CellValue>();
  for (let c = 0; c < SIZE; c++) {
    used.add(board[row * SIZE + c]);
    used.add(board[c * SIZE + col]);
  }
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      used.add(board[r * SIZE + c]);
    }
  }
  const result: CellValue[] = [];
  for (let v = 1; v <= 9; v++) {
    if (!used.has(v)) result.push(v);
  }
  return result;
}

export class SudokuSolver {
  static solve(grid: CellValue[]): CellValue[] | null {
    const board = grid.slice();
    return SudokuSolver.solveRec(board) ? board : null;
  }

  private static solveRec(board: CellValue[]): boolean {
    let bestIndex = -1;
    let bestCandidates: CellValue[] | null = null;
    for (let i = 0; i < CELLS; i++) {
      if (board[i] !== 0) continue;
      const candidates = candidatesAt(board, i);
      if (candidates.length === 0) return false;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestIndex = i;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (bestCandidates === null) return true;
    for (const value of bestCandidates) {
      board[bestIndex] = value;
      if (SudokuSolver.solveRec(board)) return true;
      board[bestIndex] = 0;
    }
    return false;
  }

  static countSolutions(grid: CellValue[], limit: number): number {
    const board = grid.slice();
    return SudokuSolver.countRec(board, limit);
  }

  private static countRec(board: CellValue[], limit: number): number {
    let bestIndex = -1;
    let bestCandidates: CellValue[] | null = null;
    for (let i = 0; i < CELLS; i++) {
      if (board[i] !== 0) continue;
      const candidates = candidatesAt(board, i);
      if (candidates.length === 0) return 0;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestIndex = i;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (bestCandidates === null) return 1;
    let count = 0;
    for (const value of bestCandidates) {
      board[bestIndex] = value;
      count += SudokuSolver.countRec(board, limit - count);
      board[bestIndex] = 0;
      if (count >= limit) break;
    }
    return count;
  }

  static findHint(board: CellValue[], solution: CellValue[]): { index: CellIndex; value: CellValue } | null {
    for (let i = 0; i < CELLS; i++) {
      if (board[i] === 0) {
        return { index: i, value: solution[i] };
      }
    }
    return null;
  }
}
