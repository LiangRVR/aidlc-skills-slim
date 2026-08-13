import type { CellIndex, CellValue } from './types';

const SIZE = 9;

export class RuleValidator {
  static conflictsAt(board: CellValue[], index: CellIndex): CellIndex[] {
    const value = board[index];
    if (value === 0) return [];
    const result: CellIndex[] = [];
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let c = 0; c < SIZE; c++) {
      const peer = row * SIZE + c;
      if (peer !== index && board[peer] === value) result.push(peer);
    }
    for (let r = 0; r < SIZE; r++) {
      const peer = r * SIZE + col;
      if (peer !== index && board[peer] === value) result.push(peer);
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        const peer = r * SIZE + c;
        if (peer !== index && board[peer] === value) result.push(peer);
      }
    }
    return result;
  }

  static isCorrect(solution: CellValue[], index: CellIndex, value: CellValue): boolean {
    return solution[index] === value;
  }

  static isComplete(board: CellValue[], solution: CellValue[]): boolean {
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== solution[i]) return false;
    }
    return true;
  }
}
