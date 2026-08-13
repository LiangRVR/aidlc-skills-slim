import type { Difficulty } from './types';

export const PROTOCOL_VERSION = 2;

export type PlayerId = string;
export type RoomId = string;

export type Op =
  | { kind: 'fill'; index: number; value: number }
  | { kind: 'erase'; index: number }
  | { kind: 'note'; index: number; value: number }
  | { kind: 'undo' }
  | { kind: 'redo' };

export interface CellEntry {
  value: number;
  given: boolean;
  owner: PlayerId | null;
  wrong: boolean;
}

export interface PlayerInfo {
  id: PlayerId;
  score: number;
}

export interface CompletedUnit {
  type: 'row' | 'col' | 'box';
  index: number;
}

/** 笔记变化条目：某格(index)的某个数字(value)笔记被移除（correct/redone）或恢复（undone） */
export interface ClearedNote {
  index: number;
  value: number;
}

export interface Snapshot {
  roomId: RoomId;
  difficulty: Difficulty;
  cells: CellEntry[];
  players: PlayerInfo[];
  yourNotes: Record<number, number[]>;
  startedAt: number;
  status: 'playing' | 'won';
  you: PlayerId;
}

export type OpResult = 'correct' | 'wrong' | 'note' | 'erased' | 'undone' | 'redone';

export type ClientMessage =
  | { type: 'join'; payload: { difficulty: Difficulty } }
  | { type: 'op'; payload: { op: Op } }
  | { type: 'leave'; payload: Record<string, never> };

export type ServerMessage =
  | { type: 'joined'; payload: Snapshot }
  | {
      type: 'opApplied';
      payload:
        | {
            playerId: PlayerId;
            op: Op;
            result: 'note';
            scores: Record<PlayerId, number>;
            notes: number[];
            clearedNotes?: ClearedNote[];
          }
        | {
            playerId: PlayerId;
            op: Op;
            result: 'correct';
            cellIndex: number;
            cell: CellEntry;
            completedUnits: CompletedUnit[];
            scores: Record<PlayerId, number>;
            clearedNotes?: ClearedNote[];
          }
        | {
            playerId: PlayerId;
            op: Op;
            result: 'wrong' | 'erased' | 'undone' | 'redone';
            cellIndex: number;
            cell: CellEntry;
            scores: Record<PlayerId, number>;
            clearedNotes?: ClearedNote[];
            /** v2.2：note 记录的 undo/redo 时携带发起者该格笔记全集（整格替换语义，修复 toggle 方向极性） */
            notes?: number[];
          };
    }
  | { type: 'opRejected'; payload: { playerId: PlayerId; reason: string } }
  | { type: 'playerJoined'; payload: { player: PlayerInfo } }
  | { type: 'playerLeft'; payload: { playerId: PlayerId } }
  | {
      type: 'gameOver';
      payload: {
        winnerId: PlayerId | null;
        reason: 'completed' | 'forfeit';
        scores: Record<PlayerId, number>;
        elapsedSeconds: number;
      };
    }
  | { type: 'error'; payload: { message: string } };

export type ProtocolMessage = ClientMessage | ServerMessage;

type Raw = Record<string, unknown>;

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasKey(v: Raw, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(v, k);
}

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'medium' || v === 'hard' || v === 'expert';
}

function isIndex(v: unknown): v is number {
  return isInt(v, 0, 80);
}

function isNotes(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.length <= 9 &&
    v.every((n) => isInt(n, 1, 9)) &&
    new Set(v).size === v.length
  );
}

function isClearedNote(v: unknown): v is ClearedNote {
  return isObj(v) && isIndex(v.index) && isInt(v.value, 1, 9);
}

function isClearedNoteArray(v: unknown): v is ClearedNote[] {
  return Array.isArray(v) && v.every(isClearedNote);
}

function isOp(v: unknown): v is Op {
  if (!isObj(v)) return false;
  switch (v.kind) {
    case 'fill':
    case 'note':
      return isIndex(v.index) && isInt(v.value, 1, 9);
    case 'erase':
      return isIndex(v.index);
    case 'undo':
    case 'redo':
      return true;
    default:
      return false;
  }
}

function isCellEntry(v: unknown): v is CellEntry {
  if (!isObj(v)) return false;
  if (!hasKey(v, 'value') || !isInt(v.value, 0, 9)) return false;
  if (!hasKey(v, 'given') || typeof v.given !== 'boolean') return false;
  if (!hasKey(v, 'owner') || !(v.owner === null || isNonEmptyString(v.owner))) return false;
  if (!hasKey(v, 'wrong') || typeof v.wrong !== 'boolean') return false;
  if (Object.keys(v).some((k) => k !== 'value' && k !== 'given' && k !== 'owner' && k !== 'wrong')) {
    return false;
  }
  if (v.given && (v.owner !== null || v.value === 0)) return false;
  if (v.value === 0 && v.wrong) return false;
  if (v.value !== 0 && !v.given && v.owner === null) return false;
  return true;
}

function isPlayerInfo(v: unknown): v is PlayerInfo {
  return isObj(v) && isNonEmptyString(v.id) && isInt(v.score, 0, Number.MAX_SAFE_INTEGER);
}

function isCompletedUnit(v: unknown): v is CompletedUnit {
  return (
    isObj(v) &&
    (v.type === 'row' || v.type === 'col' || v.type === 'box') &&
    isInt(v.index, 0, 8)
  );
}

function isScores(v: unknown): v is Record<string, number> {
  if (!isObj(v)) return false;
  const keys = Object.keys(v);
  if (keys.length < 1 || keys.length > 2) return false;
  return keys.every((k) => isNonEmptyString(k) && isInt(v[k], 0, Number.MAX_SAFE_INTEGER));
}

function isYourNotes(v: unknown, cells: CellEntry[]): v is Record<number, number[]> {
  if (!isObj(v)) return false;
  for (const k of Object.keys(v)) {
    const n = Number(k);
    if (!isInt(n, 0, 80)) return false;
    if (String(n) !== k) return false;
    if (cells[n].value !== 0) return false;
    if (!isNotes(v[k])) return false;
  }
  return true;
}

function isSnapshot(v: unknown): v is Snapshot {
  if (!isObj(v)) return false;
  if (!isNonEmptyString(v.roomId)) return false;
  if (!isDifficulty(v.difficulty)) return false;
  if (!Array.isArray(v.cells) || v.cells.length !== 81 || !v.cells.every(isCellEntry)) return false;
  if (!Array.isArray(v.players) || v.players.length < 1 || v.players.length > 2) return false;
  if (!v.players.every(isPlayerInfo)) return false;
  if (!isYourNotes(v.yourNotes, v.cells)) return false;
  if (!isInt(v.startedAt, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (v.status !== 'playing' && v.status !== 'won') return false;
  if (!isNonEmptyString(v.you)) return false;
  if (!v.players.some((p) => p.id === v.you)) return false;
  return true;
}

function isOpResult(v: unknown): v is OpResult {
  return (
    v === 'correct' ||
    v === 'wrong' ||
    v === 'note' ||
    v === 'erased' ||
    v === 'undone' ||
    v === 'redone'
  );
}

function isOpAppliedPayload(p: unknown): boolean {
  if (!isObj(p)) return false;
  if (!isNonEmptyString(p.playerId)) return false;
  if (!isOp(p.op)) return false;
  if (!isOpResult(p.result)) return false;
  if (!isScores(p.scores)) return false;
  if (hasKey(p, 'clearedNotes') && !isClearedNoteArray(p.clearedNotes)) return false;
  switch (p.result) {
    case 'note':
      return (
        hasKey(p, 'notes') &&
        isNotes(p.notes) &&
        !hasKey(p, 'cellIndex') &&
        !hasKey(p, 'cell') &&
        !hasKey(p, 'completedUnits')
      );
    case 'correct':
      return (
        hasKey(p, 'cellIndex') &&
        isIndex(p.cellIndex) &&
        hasKey(p, 'cell') &&
        isCellEntry(p.cell) &&
        hasKey(p, 'completedUnits') &&
        Array.isArray(p.completedUnits) &&
        p.completedUnits.every(isCompletedUnit)
      );
    case 'wrong':
    case 'erased':
    case 'undone':
    case 'redone':
      return (
        hasKey(p, 'cellIndex') &&
        isIndex(p.cellIndex) &&
        hasKey(p, 'cell') &&
        isCellEntry(p.cell) &&
        !hasKey(p, 'completedUnits') &&
        (!hasKey(p, 'notes') || isNotes(p.notes))
      );
    default:
      return false;
  }
}

function isGameOverPayload(p: unknown): boolean {
  if (!isObj(p)) return false;
  if (!(p.winnerId === null || isNonEmptyString(p.winnerId))) return false;
  if (p.reason !== 'completed' && p.reason !== 'forfeit') return false;
  if (!isScores(p.scores)) return false;
  if (!isInt(p.elapsedSeconds, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (p.reason === 'forfeit' && p.winnerId === null) return false;
  return true;
}

function validPayload(type: string, p: unknown): boolean {
  switch (type) {
    case 'join':
      return isObj(p) && isDifficulty(p.difficulty);
    case 'op':
      return isObj(p) && isOp(p.op);
    case 'leave':
      return isObj(p);
    case 'joined':
      return isSnapshot(p);
    case 'opApplied':
      return isOpAppliedPayload(p);
    case 'opRejected':
      return isObj(p) && isNonEmptyString(p.playerId) && isNonEmptyString(p.reason);
    case 'playerJoined':
      return isObj(p) && isPlayerInfo(p.player);
    case 'playerLeft':
      return isObj(p) && isNonEmptyString(p.playerId);
    case 'gameOver':
      return isGameOverPayload(p);
    case 'error':
      return isObj(p) && isNonEmptyString(p.message);
    default:
      return false;
  }
}

export function serialize(msg: ProtocolMessage): string {
  return JSON.stringify({ version: PROTOCOL_VERSION, type: msg.type, payload: msg.payload });
}

export function deserialize(raw: string): ProtocolMessage | null {
  if (typeof raw !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed)) return null;
  if (!isInt(parsed.version, PROTOCOL_VERSION, PROTOCOL_VERSION)) return null;
  if (!isNonEmptyString(parsed.type)) return null;
  if (!validPayload(parsed.type, parsed.payload)) return null;
  return { type: parsed.type, payload: parsed.payload } as ProtocolMessage;
}
