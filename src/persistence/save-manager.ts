import { SAVE_VERSION } from '../core/types';
import type { CellIndex, CellValue, Difficulty, GameSave, GameStatus, Move } from '../core/types';

const SAVE_KEY = 'sudoku-game-save';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const STATUSES: GameStatus[] = ['playing', 'won', 'lost'];
const MOVE_TYPES: readonly string[] = ['fill', 'erase', 'note', 'hint'];

function isCellValue(v: unknown): v is CellValue {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 9;
}

function isCellIndex(v: unknown): v is CellIndex {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 81;
}

function isNoteValue(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 9;
}

function isBoard(a: unknown): a is CellValue[] {
  return Array.isArray(a) && a.length === 81 && a.every(isCellValue);
}

function isNotes(a: unknown): a is number[][] {
  return Array.isArray(a) && a.length === 81 && a.every((row) => Array.isArray(row) && row.every(isNoteValue));
}

function isMove(m: unknown): m is Move {
  if (typeof m !== 'object' || m === null) return false;
  const move = m as Record<string, unknown>;
  if (typeof move.type !== 'string' || !MOVE_TYPES.includes(move.type)) return false;
  if (!isCellIndex(move.index)) return false;
  if (!isCellValue(move.prevValue) || !isCellValue(move.nextValue)) return false;
  if (!Array.isArray(move.prevNotes) || !move.prevNotes.every(isNoteValue)) return false;
  if (!Array.isArray(move.nextNotes) || !move.nextNotes.every(isNoteValue)) return false;
  if (!Array.isArray(move.clearedPeerNotes)) return false;
  for (const c of move.clearedPeerNotes) {
    if (typeof c !== 'object' || c === null) return false;
    const peer = c as Record<string, unknown>;
    if (!isCellIndex(peer.index) || !isNoteValue(peer.value)) return false;
  }
  return typeof move.mistakesDelta === 'number' && Number.isInteger(move.mistakesDelta);
}

function isValidSave(data: unknown): data is GameSave {
  if (typeof data !== 'object' || data === null) return false;
  const save = data as Record<string, unknown>;
  if (save.version !== SAVE_VERSION) return false;
  if (typeof save.difficulty !== 'string' || !DIFFICULTIES.includes(save.difficulty as Difficulty)) return false;
  if (!isBoard(save.givens) || !isBoard(save.solution) || !isBoard(save.board)) return false;
  if (!isNotes(save.notes)) return false;
  if (!(typeof save.mistakes === 'number' && Number.isInteger(save.mistakes) && save.mistakes >= 0 && save.mistakes <= 3)) {
    return false;
  }
  if (!(typeof save.elapsedSeconds === 'number' && Number.isFinite(save.elapsedSeconds) && save.elapsedSeconds >= 0)) {
    return false;
  }
  if (!Array.isArray(save.history) || !save.history.every(isMove)) return false;
  return typeof save.status === 'string' && STATUSES.includes(save.status as GameStatus);
}

export class SaveManager {
  save(data: GameSave): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {}
  }

  load(): GameSave | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return isValidSave(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
  }
}
