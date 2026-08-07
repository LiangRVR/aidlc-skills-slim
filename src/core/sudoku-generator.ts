import { SudokuSolver } from './sudoku-solver';
import type { CellIndex, CellValue, Difficulty, Puzzle } from './types';

const CELLS = 81;

const GIVEN_RANGES: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  medium: [32, 39],
  hard: [26, 31],
  expert: [22, 25],
};

function shuffle(values: CellValue[]): CellValue[] {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

export class SudokuGenerator {
  static generate(difficulty: Difficulty): Puzzle {
    const [minGivens, maxGivens] = GIVEN_RANGES[difficulty];
    let last: Puzzle | null = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      const puzzle = SudokuGenerator.generateOnce(difficulty);
      const count = puzzle.givens.reduce((n, v) => (v !== 0 ? n + 1 : n), 0);
      if (count >= minGivens && count <= maxGivens) return puzzle;
      last = puzzle;
    }
    return last as Puzzle;
  }

  private static generateOnce(difficulty: Difficulty): Puzzle {
    const solution = SudokuGenerator.generateFullSolution();
    const givens = solution.slice();
    const [minGivens, maxGivens] = GIVEN_RANGES[difficulty];
    const target = minGivens + Math.floor(Math.random() * (maxGivens - minGivens + 1));
    let givenCount = CELLS;
    const order = shuffle(Array.from({ length: CELLS }, (_, i) => i));
    for (const index of order) {
      if (givenCount <= target) break;
      if (givens[index] === 0) continue;
      const partner = CELLS - 1 - index;
      const dug: CellIndex[] = [index];
      givens[index] = 0;
      if (partner !== index && givens[partner] !== 0) {
        if (givenCount - 2 < target) {
          givens[index] = solution[index];
          continue;
        }
        givens[partner] = 0;
        dug.push(partner);
      }
      if (SudokuSolver.countSolutions(givens, 2) !== 1) {
        for (const i of dug) {
          givens[i] = solution[i];
        }
      } else {
        givenCount -= dug.length;
      }
    }
    return { givens, solution };
  }

  private static generateFullSolution(): CellValue[] {
    const board: CellValue[] = new Array(CELLS).fill(0);
    SudokuGenerator.fillRec(board);
    return board;
  }

  private static fillRec(board: CellValue[]): boolean {
    let index = -1;
    for (let i = 0; i < CELLS; i++) {
      if (board[i] === 0) {
        index = i;
        break;
      }
    }
    if (index === -1) return true;
    for (const value of shuffle(SudokuGenerator.candidatesAt(board, index))) {
      board[index] = value;
      if (SudokuGenerator.fillRec(board)) return true;
      board[index] = 0;
    }
    return false;
  }

  private static candidatesAt(board: CellValue[], index: CellIndex): CellValue[] {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const used = new Set<CellValue>();
    for (let c = 0; c < 9; c++) {
      used.add(board[row * 9 + c]);
      used.add(board[c * 9 + col]);
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        used.add(board[r * 9 + c]);
      }
    }
    const result: CellValue[] = [];
    for (let v = 1; v <= 9; v++) {
      if (!used.has(v)) result.push(v);
    }
    return result;
  }
}
