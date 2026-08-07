import fc from 'fast-check';
import type {
  CellEntry,
  ClientMessage,
  CompletedUnit,
  Op,
  PlayerInfo,
  ProtocolMessage,
  ServerMessage,
  Snapshot,
} from '../shared/protocol';

export const arbPlayerId = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim().length > 0);
export const arbRoomId = arbPlayerId;
export const arbDifficulty = fc.constantFrom('easy', 'medium', 'hard', 'expert') as fc.Arbitrary<
  'easy' | 'medium' | 'hard' | 'expert'
>;
export const arbIndex = fc.integer({ min: 0, max: 80 });
export const arbValue = fc.integer({ min: 1, max: 9 });
export const arbNotes = fc.uniqueArray(arbValue, { maxLength: 9 });

export const arbCellEntry: fc.Arbitrary<CellEntry> = fc.oneof(
  fc.record({
    value: arbValue,
    given: fc.constant(true),
    owner: fc.constant(null),
    wrong: fc.constant(false),
    notes: arbNotes,
  }),
  fc.record({
    value: fc.constant(0),
    given: fc.constant(false),
    owner: fc.constant(null),
    wrong: fc.constant(false),
    notes: arbNotes,
  }),
  fc.record({
    value: arbValue,
    given: fc.constant(false),
    owner: arbPlayerId,
    wrong: fc.boolean(),
    notes: arbNotes,
  })
);

export const arbPlayerInfo: fc.Arbitrary<PlayerInfo> = fc.record({
  id: arbPlayerId,
  mistakes: fc.integer({ min: 0, max: 3 }),
  spectating: fc.boolean(),
});

export const arbSnapshot: fc.Arbitrary<Snapshot> = fc
  .tuple(
    arbRoomId,
    arbDifficulty,
    fc.array(arbCellEntry, { minLength: 81, maxLength: 81 }),
    fc.array(arbPlayerInfo, { minLength: 1, maxLength: 2 }),
    fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
    fc.constantFrom('playing', 'won') as fc.Arbitrary<'playing' | 'won'>
  )
  .map(([roomId, difficulty, cells, players, startedAt, status]) => ({
    roomId,
    difficulty,
    cells,
    players,
    startedAt,
    status,
    you: players[0].id,
  }));

export const arbCompletedUnit: fc.Arbitrary<CompletedUnit> = fc.record({
  type: fc.constantFrom('row', 'col', 'box') as fc.Arbitrary<'row' | 'col' | 'box'>,
  index: fc.integer({ min: 0, max: 8 }),
});

export const arbOp: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('fill' as const), index: arbIndex, value: arbValue }),
  fc.record({ kind: fc.constant('erase' as const), index: arbIndex }),
  fc.record({ kind: fc.constant('note' as const), index: arbIndex, value: arbValue }),
  fc.record({ kind: fc.constant('undo' as const) }),
  fc.record({ kind: fc.constant('redo' as const) })
);

export const arbClientMessage: fc.Arbitrary<ClientMessage> = fc.oneof(
  arbDifficulty.map((difficulty) => ({ type: 'join' as const, payload: { difficulty } })),
  arbOp.map((op) => ({ type: 'op' as const, payload: { op } })),
  fc.constant({ type: 'leave' as const, payload: {} })
);

export const arbServerMessage: fc.Arbitrary<ServerMessage> = fc.oneof(
  arbSnapshot.map((snapshot) => ({ type: 'joined' as const, payload: snapshot })),
  fc
    .tuple(arbPlayerId, arbOp, fc.constantFrom('correct', 'wrong', 'note', 'erased', 'undone', 'redone'), arbCellEntry, fc.array(arbIndex, { maxLength: 20 }), fc.array(arbCompletedUnit, { maxLength: 3 }))
    .map(([playerId, op, result, cell, clearedNotes, completedUnits]) => ({
      type: 'opApplied' as const,
      payload: { playerId, op, result: result as 'correct' | 'wrong' | 'note' | 'erased' | 'undone' | 'redone', cell, clearedNotes, completedUnits },
    })),
  fc.tuple(arbPlayerId, fc.string({ minLength: 1 })).map(([playerId, reason]) => ({
    type: 'opRejected' as const,
    payload: { playerId, reason },
  })),
  arbPlayerInfo.map((player) => ({ type: 'playerJoined' as const, payload: { player } })),
  arbPlayerId.map((playerId) => ({ type: 'playerLeft' as const, payload: { playerId } })),
  arbPlayerId.map((playerId) => ({ type: 'playerLost' as const, payload: { playerId } })),
  fc.integer({ min: 0, max: 100000 }).map((elapsedSeconds) => ({
    type: 'gameWon' as const,
    payload: { elapsedSeconds },
  })),
  fc.string({ minLength: 1 }).map((message) => ({ type: 'error' as const, payload: { message } }))
);

export const arbMessage: fc.Arbitrary<ProtocolMessage> = fc.oneof(arbClientMessage, arbServerMessage);

type Envelope = Record<string, unknown>;

export type Mutator = (envelope: Envelope) => Envelope | null;

const universalMutators: Mutator[] = [
  (e) => ({ ...e, version: 2 }),
  (e) => ({ ...e, version: '1' }),
  (e) => ({ ...e, type: '__unknown__' }),
  (e) => ({ ...e, payload: null }),
  (e) => ({ ...e, payload: 42 }),
  (e) => {
    const c = { ...e };
    delete c.payload;
    return c;
  },
  (e) => {
    const c = { ...e };
    delete c.type;
    return c;
  },
];

const targetedMutators: Mutator[] = [
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'op' || !p || typeof p !== 'object') return null;
    const op = p.op as Record<string, unknown>;
    if (op.kind !== 'fill' && op.kind !== 'note') return null;
    return { ...e, payload: { ...p, op: { ...op, index: 81 } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'op' || !p || typeof p !== 'object') return null;
    const op = p.op as Record<string, unknown>;
    if (op.kind !== 'fill' && op.kind !== 'note') return null;
    return { ...e, payload: { ...p, op: { ...op, value: 10 } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    const cells = p.cells as unknown[];
    return { ...e, payload: { ...p, cells: cells.slice(0, 80) } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, players: [] } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, you: 'no-such-player' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, result: 'maybe' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'playerLost' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, playerId: '' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'gameWon' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, elapsedSeconds: -1 } };
  },
];

export const allMutators: Mutator[] = [...universalMutators, ...targetedMutators];

export function applicableMutators(envelope: Envelope): Mutator[] {
  return allMutators.filter((m) => m(envelope) !== null);
}

export const arbEnvelopeMutation = (envelope: Envelope) =>
  fc.constantFrom(...applicableMutators(envelope));
