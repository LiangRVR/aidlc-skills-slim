import fc from 'fast-check';
import type { Difficulty } from '../src/core/types';
import type { Op, PlayerId, ServerMessage } from '../shared/protocol';
import { GameRoom } from '../server/game-room';
import type { JoinableRoomInfo } from '../server/room-manager';

export const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
  .split('')
  .map(Number);
export const GIVENS = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
  .split('')
  .map(Number);
export const PUZZLE = { givens: GIVENS, solution: SOLUTION };

export const emptyIndices = (): number[] => GIVENS.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
export const givenIndices = (): number[] => GIVENS.map((v, i) => (v !== 0 ? i : -1)).filter((i) => i >= 0);

export const wrongValue = (index: number): number => (SOLUTION[index] % 9) + 1;

export interface SentRecord {
  playerId: PlayerId;
  msg: ServerMessage;
}

export interface SendRecorder {
  send: (playerId: PlayerId, msg: ServerMessage) => void;
  log: SentRecord[];
  messagesFor: (id: PlayerId) => ServerMessage[];
  clear: () => void;
}

export function makeSendRecorder(): SendRecorder {
  const log: SentRecord[] = [];
  return {
    send: (playerId, msg) => {
      log.push({ playerId, msg });
    },
    log,
    messagesFor: (id) => log.filter((r) => r.playerId === id).map((r) => r.msg),
    clear: () => {
      log.length = 0;
    },
  };
}

export function makeRoom(playerIds: PlayerId[] = []): { room: GameRoom; recorder: SendRecorder } {
  const recorder = makeSendRecorder();
  const room = new GameRoom(PUZZLE, 'medium', 'r1', 1_000_000, recorder.send);
  for (const id of playerIds) {
    room.addPlayer(id);
  }
  recorder.clear();
  return { room, recorder };
}

export const arbDifficulty: fc.Arbitrary<Difficulty> = fc.constantFrom('easy', 'medium', 'hard', 'expert');

export const arbJoinableRoomInfo: fc.Arbitrary<JoinableRoomInfo> = fc.record({
  roomId: fc.uuid(),
  difficulty: arbDifficulty,
  status: fc.constantFrom('playing', 'won'),
  playerCount: fc.integer({ min: 0, max: 2 }),
  startedAt: fc.integer({ min: 0, max: 1_000_000_000_000 }),
});

export const arbRoomPool: fc.Arbitrary<JoinableRoomInfo[]> = fc.array(arbJoinableRoomInfo, { maxLength: 6 });

export const arbOpOn: fc.Arbitrary<Op> = fc.oneof(
  { weight: 6, arbitrary: fc.record({ kind: fc.constant('fill' as const), index: fc.constantFrom(...emptyIndices()), value: fc.integer({ min: 1, max: 9 }) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('erase' as const), index: fc.integer({ min: 0, max: 80 }) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('note' as const), index: fc.constantFrom(...emptyIndices()), value: fc.integer({ min: 1, max: 9 }) }) },
  { weight: 1, arbitrary: fc.constant({ kind: 'undo' as const }) },
  { weight: 1, arbitrary: fc.constant({ kind: 'redo' as const }) }
);

export const arbOpScript = (maxLen = 30): fc.Arbitrary<Op[]> => fc.array(arbOpOn, { maxLength: maxLen });

export const arbTwoPlayerScript = (
  maxLen = 30
): fc.Arbitrary<{ player: 0 | 1; op: Op }[]> =>
  fc.array(fc.record({ player: fc.constantFrom(0 as const, 1 as const), op: arbOpOn }), { maxLength: maxLen });
