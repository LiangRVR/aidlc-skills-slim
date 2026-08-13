export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type CellIndex = number;
export type CellValue = number;

export interface Puzzle {
  givens: CellValue[];
  solution: CellValue[];
}
