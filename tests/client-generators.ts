import fc from 'fast-check';
import type { ClientMessage, ServerMessage, Snapshot } from '../shared/protocol';
import { EventBus } from '../src/core/event-bus';
import { OnlineGameController } from '../src/net/online-game-controller';
import { arbCellEntry, arbCompletedUnit, arbIndex, arbOp } from './generators';
import { GIVENS } from './server-generators';

export interface WsStub {
  sent: ClientMessage[];
  closed: boolean;
  messageCb: ((msg: ServerMessage) => void) | null;
  closeCb: (() => void) | null;
  connect(url: string): Promise<void>;
  send(msg: ClientMessage): void;
  onMessage(cb: (msg: ServerMessage) => void): void;
  onClose(cb: () => void): void;
  close(): void;
  emitMessage(msg: ServerMessage): void;
  emitClose(): void;
}

export function makeWsStub(): WsStub {
  const stub: WsStub = {
    sent: [],
    closed: false,
    messageCb: null,
    closeCb: null,
    connect: () => Promise.resolve(),
    send(msg) {
      stub.sent.push(msg);
    },
    onMessage(cb) {
      stub.messageCb = cb;
    },
    onClose(cb) {
      stub.closeCb = cb;
    },
    close() {
      stub.closed = true;
    },
    emitMessage(msg) {
      stub.messageCb?.(msg);
    },
    emitClose() {
      stub.closeCb?.();
    },
  };
  return stub;
}

export function makeController(): { bus: EventBus; ws: WsStub; oc: OnlineGameController } {
  const bus = new EventBus();
  const ws = makeWsStub();
  const oc = new OnlineGameController(bus, ws);
  return { bus, ws, oc };
}

export function makeSnapshot(you = 'me', players: string[] = ['me']): Snapshot {
  return {
    roomId: 'r1',
    difficulty: 'medium',
    cells: GIVENS.map((v) => ({ value: v, given: v !== 0, owner: null, wrong: false, notes: [] })),
    players: players.map((id) => ({ id, mistakes: 0, spectating: false })),
    startedAt: Date.now() - 5000,
    status: 'playing',
    you,
  };
}

export function joinController(_oc: OnlineGameController, ws: WsStub, you = 'me', players: string[] = ['me']): void {
  ws.emitMessage({ type: 'joined', payload: makeSnapshot(you, players) });
}

export const arbOpApplied = (playerId: string): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>> =>
  fc
    .tuple(
      arbOp,
      fc.constantFrom('correct', 'wrong', 'note', 'erased', 'undone', 'redone' as const),
      arbIndex,
      arbCellEntry,
      fc.array(arbIndex, { maxLength: 6 }),
      fc.array(arbCompletedUnit, { maxLength: 3 })
    )
    .map(([op, result, cellIndex, cell, clearedNotes, completedUnits]) => ({
      type: 'opApplied' as const,
      payload: { playerId, op, result, cellIndex, cell, clearedNotes, completedUnits },
    }));

export const arbOpAppliedStream = (
  playerIds: string[],
  maxLen = 20
): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>[]> =>
  fc.array(
    fc
      .constantFrom(...playerIds)
      .chain((id) => arbOpApplied(id)),
    { maxLength: maxLen }
  );
