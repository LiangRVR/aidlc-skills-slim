import { describe, expect, it } from 'vitest';
import {
  deserialize,
  serialize,
  type ClientMessage,
  type ProtocolMessage,
  type ServerMessage,
  type Snapshot,
} from '../shared/protocol';

const snapshot: Snapshot = {
  roomId: 'room-1',
  difficulty: 'medium',
  cells: Array.from({ length: 81 }, () => ({
    value: 0,
    given: false,
    owner: null,
    wrong: false,
    notes: [],
  })),
  players: [{ id: 'p1', mistakes: 0, spectating: false }],
  startedAt: 1723000000000,
  status: 'playing',
  you: 'p1',
};

const clientMessages: ClientMessage[] = [
  { type: 'join', payload: { difficulty: 'hard' } },
  { type: 'op', payload: { op: { kind: 'fill', index: 40, value: 7 } } },
  { type: 'leave', payload: {} },
];

const serverMessages: ServerMessage[] = [
  { type: 'joined', payload: snapshot },
  {
    type: 'opApplied',
    payload: {
      playerId: 'p1',
      op: { kind: 'fill', index: 40, value: 7 },
      result: 'correct',
      cellIndex: 40,
      cell: { value: 7, given: false, owner: 'p1', wrong: false, notes: [] },
      clearedNotes: [39, 41],
      completedUnits: [{ type: 'row', index: 4 }],
    },
  },
  { type: 'opRejected', payload: { playerId: 'p1', reason: 'spectating' } },
  { type: 'playerJoined', payload: { player: { id: 'p2', mistakes: 0, spectating: false } } },
  { type: 'playerLeft', payload: { playerId: 'p2' } },
  { type: 'playerLost', payload: { playerId: 'p2' } },
  { type: 'gameWon', payload: { elapsedSeconds: 600 } },
  { type: 'error', payload: { message: 'bad message' } },
];

describe('protocol serialize/deserialize (example-based)', () => {
  it.each([...clientMessages, ...serverMessages])('round-trips %s', (msg: ProtocolMessage) => {
    expect(deserialize(serialize(msg))).toEqual(msg);
  });

  it('serialize injects version 1 into the envelope', () => {
    const raw = JSON.parse(serialize(clientMessages[0]));
    expect(raw.version).toBe(1);
    expect(raw.type).toBe('join');
    expect(raw.payload).toEqual({ difficulty: 'hard' });
  });

  it.each([
    ['not json', 'not json at all'],
    ['empty string', ''],
    ['json array', '[1,2,3]'],
    ['json number', '42'],
    ['missing version', JSON.stringify({ type: 'join', payload: { difficulty: 'easy' } })],
    ['wrong version', JSON.stringify({ version: 2, type: 'join', payload: { difficulty: 'easy' } })],
    ['string version', JSON.stringify({ version: '1', type: 'join', payload: { difficulty: 'easy' } })],
    ['unknown type', JSON.stringify({ version: 1, type: 'fly', payload: {} })],
    ['missing payload', JSON.stringify({ version: 1, type: 'join' })],
    ['null payload', JSON.stringify({ version: 1, type: 'join', payload: null })],
  ])('rejects %s', (_label, raw) => {
    expect(deserialize(raw)).toBeNull();
  });

  it.each([
    ['bad difficulty', { type: 'join', payload: { difficulty: 'extreme' } }],
    ['fill index out of range', { type: 'op', payload: { op: { kind: 'fill', index: 81, value: 5 } } }],
    ['fill value out of range', { type: 'op', payload: { op: { kind: 'fill', index: 5, value: 0 } } }],
    ['erase without index', { type: 'op', payload: { op: { kind: 'erase' } } }],
    ['unknown op kind', { type: 'op', payload: { op: { kind: 'explode' } } }],
    ['opRejected empty reason', { type: 'opRejected', payload: { playerId: 'p1', reason: '' } }],
    ['playerLost empty id', { type: 'playerLost', payload: { playerId: '' } }],
    ['gameWon negative', { type: 'gameWon', payload: { elapsedSeconds: -5 } }],
    ['error empty message', { type: 'error', payload: { message: '' } }],
  ])('rejects invalid payload: %s', (_label, msg) => {
    expect(deserialize(JSON.stringify({ version: 1, ...(msg as object) }))).toBeNull();
  });

  describe('CellEntry consistency (BR-P-06/07/08)', () => {
    const cellCase = (cell: object) =>
      JSON.stringify({
        version: 1,
        type: 'opApplied',
        payload: {
          playerId: 'p1',
          op: { kind: 'fill', index: 0, value: 3 },
          result: 'correct',
          cellIndex: 0,
          cell,
          clearedNotes: [],
          completedUnits: [],
        },
      });

    it('accepts a given cell (value set, owner null)', () => {
      const raw = cellCase({ value: 5, given: true, owner: null, wrong: false, notes: [] });
      expect(deserialize(raw)).not.toBeNull();
    });

    it('rejects a given cell with an owner (BR-P-06)', () => {
      const raw = cellCase({ value: 5, given: true, owner: 'p1', wrong: false, notes: [] });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects an empty cell marked wrong (BR-P-07)', () => {
      const raw = cellCase({ value: 0, given: false, owner: null, wrong: true, notes: [] });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects a filled player cell without owner (BR-P-08)', () => {
      const raw = cellCase({ value: 5, given: false, owner: null, wrong: false, notes: [] });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects notes with duplicates', () => {
      const raw = cellCase({ value: 0, given: false, owner: null, wrong: false, notes: [1, 1] });
      expect(deserialize(raw)).toBeNull();
    });
  });

  describe('Snapshot validation', () => {
    it('rejects cells array of wrong length', () => {
      expect(
        deserialize(JSON.stringify({ version: 1, type: 'joined', payload: { ...snapshot, cells: snapshot.cells.slice(0, 80) } }))
      ).toBeNull();
    });

    it('rejects you not present in players', () => {
      expect(
        deserialize(JSON.stringify({ version: 1, type: 'joined', payload: { ...snapshot, you: 'ghost' } }))
      ).toBeNull();
    });

    it('rejects mistakes above 3', () => {
      const bad = { ...snapshot, players: [{ id: 'p1', mistakes: 4, spectating: true }] };
      expect(deserialize(JSON.stringify({ version: 1, type: 'joined', payload: bad }))).toBeNull();
    });
  });
});
