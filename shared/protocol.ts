import type { Difficulty } from '../src/core/types';

export const PROTOCOL_VERSION = 1;

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
  notes: number[];
}

export interface PlayerInfo {
  id: PlayerId;
  mistakes: number;
  spectating: boolean;
}

export interface CompletedUnit {
  type: 'row' | 'col' | 'box';
  index: number;
}

export interface Snapshot {
  roomId: RoomId;
  difficulty: Difficulty;
  cells: CellEntry[];
  players: PlayerInfo[];
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
      payload: {
        playerId: PlayerId;
        op: Op;
        result: OpResult;
        cellIndex: number;
        cell: CellEntry;
        clearedNotes: number[];
        completedUnits: CompletedUnit[];
      };
    }
  | { type: 'opRejected'; payload: { playerId: PlayerId; reason: string } }
  | { type: 'playerJoined'; payload: { player: PlayerInfo } }
  | { type: 'playerLeft'; payload: { playerId: PlayerId } }
  | { type: 'playerLost'; payload: { playerId: PlayerId } }
  | { type: 'gameWon'; payload: { elapsedSeconds: number } }
  | { type: 'error'; payload: { message: string } };

export type ProtocolMessage = ClientMessage | ServerMessage;

type Raw = Record<string, unknown>;

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
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

function isIndexArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every(isIndex);
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
  if (!isInt(v.value, 0, 9)) return false;
  if (typeof v.given !== 'boolean') return false;
  if (!(v.owner === null || isNonEmptyString(v.owner))) return false;
  if (typeof v.wrong !== 'boolean') return false;
  if (!isNotes(v.notes)) return false;
  if (v.given && (v.owner !== null || v.value === 0)) return false;
  if (v.value === 0 && v.wrong) return false;
  if (v.value !== 0 && !v.given && v.owner === null) return false;
  return true;
}

function isPlayerInfo(v: unknown): v is PlayerInfo {
  return (
    isObj(v) &&
    isNonEmptyString(v.id) &&
    isInt(v.mistakes, 0, 3) &&
    typeof v.spectating === 'boolean'
  );
}

function isCompletedUnit(v: unknown): v is CompletedUnit {
  return (
    isObj(v) &&
    (v.type === 'row' || v.type === 'col' || v.type === 'box') &&
    isInt(v.index, 0, 8)
  );
}

function isSnapshot(v: unknown): v is Snapshot {
  if (!isObj(v)) return false;
  if (!isNonEmptyString(v.roomId)) return false;
  if (!isDifficulty(v.difficulty)) return false;
  if (!Array.isArray(v.cells) || v.cells.length !== 81 || !v.cells.every(isCellEntry)) return false;
  if (!Array.isArray(v.players) || v.players.length < 1 || v.players.length > 2) return false;
  if (!v.players.every(isPlayerInfo)) return false;
  if (typeof v.startedAt !== 'number' || v.startedAt < 0) return false;
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
      return (
        isObj(p) &&
        isNonEmptyString(p.playerId) &&
        isOp(p.op) &&
        isOpResult(p.result) &&
        isInt(p.cellIndex, 0, 80) &&
        isCellEntry(p.cell) &&
        isIndexArray(p.clearedNotes) &&
        Array.isArray(p.completedUnits) &&
        p.completedUnits.every(isCompletedUnit)
      );
    case 'opRejected':
      return isObj(p) && isNonEmptyString(p.playerId) && isNonEmptyString(p.reason);
    case 'playerJoined':
      return isObj(p) && isPlayerInfo(p.player);
    case 'playerLeft':
    case 'playerLost':
      return isObj(p) && isNonEmptyString(p.playerId);
    case 'gameWon':
      return isObj(p) && typeof p.elapsedSeconds === 'number' && p.elapsedSeconds >= 0;
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
