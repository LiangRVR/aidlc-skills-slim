export type Difficulty = 'easy' | 'medium' | 'hard';
export type CellIndex = number;
export type CellValue = number;
export type GameStatus = 'playing' | 'won' | 'lost';

export interface Puzzle {
  givens: CellValue[];
  solution: CellValue[];
}

export type MoveType = 'fill' | 'erase' | 'note' | 'hint';

export interface Move {
  type: MoveType;
  index: CellIndex;
  prevValue: CellValue;
  nextValue: CellValue;
  prevNotes: number[];
  nextNotes: number[];
  clearedPeerNotes: { index: CellIndex; value: CellValue }[];
  mistakesDelta: number;
}

export interface GameSave {
  version: number;
  difficulty: Difficulty;
  givens: CellValue[];
  solution: CellValue[];
  board: CellValue[];
  notes: number[][];
  mistakes: number;
  elapsedSeconds: number;
  history: Move[];
  status: GameStatus;
}

export const EVENTS = {
  STATE_CHANGED: 'state:changed',
  CONFLICT_UPDATED: 'conflict:updated',
  MISTAKES_CHANGED: 'mistakes:changed',
  TIMER_TICK: 'timer:tick',
  NOTE_MODE_CHANGED: 'note-mode:changed',
  GAME_WON: 'game:won',
  GAME_LOST: 'game:lost',
} as const;

export const MAX_MISTAKES = 3;
export const SAVE_VERSION = 1;
