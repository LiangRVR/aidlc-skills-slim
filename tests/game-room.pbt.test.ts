import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../src/core/types';
import type { Op, ServerMessage } from '../shared/protocol';
import { RoomManager, selectRoom, type JoinableRoomInfo } from '../server/room-manager';
import {
  arbDifficulty,
  arbRoomPool,
  arbTwoPlayerScript,
  emptyIndices,
  makeRoom,
  makeSendRecorder,
  opsOf,
  SOLUTION,
} from './server-generators';

const IDS = ['A', 'B'] as const;

const sameOp = (a: Op, b: Op): boolean => JSON.stringify(a) === JSON.stringify(b);

const isJoinable = (r: JoinableRoomInfo): boolean => r.status === 'playing' && r.playerCount === 1;

const TIERS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function refSelect(pool: JoinableRoomInfo[], d: Difficulty): JoinableRoomInfo | null {
  const joinable = pool.filter(isJoinable);
  if (joinable.length === 0) return null;
  const same = joinable.filter((r) => r.difficulty === d);
  if (same.length > 0) {
    return same.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
  }
  const req = TIERS.indexOf(d);
  const rank = (r: JoinableRoomInfo): { dist: number; harder: number } => {
    const tier = TIERS.indexOf(r.difficulty);
    return { dist: Math.abs(tier - req), harder: tier };
  };
  const bestKey = joinable.reduce((best, r) => {
    const k = rank(r);
    return k.dist < best.dist || (k.dist === best.dist && k.harder > best.harder) ? k : best;
  }, rank(joinable[0]));
  const candidates = joinable.filter((r) => {
    const k = rank(r);
    return k.dist === bestKey.dist && k.harder === bestKey.harder;
  });
  return candidates.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
}

const peerIndices = (index: number): number[] => {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const s = new Set<number>();
  for (let c = 0; c < 9; c++) {
    const p = row * 9 + c;
    if (p !== index) s.add(p);
  }
  for (let r = 0; r < 9; r++) {
    const p = r * 9 + col;
    if (p !== index) s.add(p);
  }
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const p = r * 9 + c;
      if (p !== index) s.add(p);
    }
  }
  return Array.from(s);
};

describe('SP-1 匹配算法不变量（Oracle）', () => {
  it('selectRoom 与参考实现一致，且满足可加入谓词不变量', () => {
    fc.assert(
      fc.property(arbRoomPool, arbDifficulty, (pool, d) => {
        const got = selectRoom(pool, d);
        const expected = refSelect(pool, d);
        expect(got?.roomId ?? null).toBe(expected?.roomId ?? null);
        const anyJoinable = pool.some(isJoinable);
        if (!anyJoinable) {
          expect(got).toBeNull();
        } else {
          expect(got).not.toBeNull();
          expect(got && isJoinable(got)).toBe(true);
        }
        const sameJoinable = pool.filter((r) => isJoinable(r) && r.difficulty === d);
        if (sameJoinable.length > 0) {
          expect(got?.difficulty).toBe(d);
          for (const r of sameJoinable) {
            expect(got && r.startedAt >= got.startedAt).toBe(true);
          }
        }
      })
    );
  });
});

describe('SP-2 房间状态机不变量', () => {
  it('任意双人 op 脚本：CellEntry 一致性 / score≥0 / 拒绝无副作用 / 状态单向 / won 后 op 全拒', () => {
    fc.assert(
      fc.property(arbTwoPlayerScript(20), (script) => {
        const { room, recorder } = makeRoom([...IDS]);
        let prevStatus = room.getStatus();
        for (const step of script) {
          const actor = IDS[step.player];
          const cellsBefore = room.getCells();
          recorder.clear();
          expect(() => room.handleOp(actor, step.op)).not.toThrow();
          const cells = room.getCells();
          for (let i = 0; i < 81; i++) {
            const c = cells[i];
            if (c.given) {
              expect(c.owner).toBeNull();
              expect(c.value).not.toBe(0);
              expect(c.wrong).toBe(false);
            }
            if (c.value === 0) expect(c.wrong).toBe(false);
            if (c.value !== 0 && !c.given) expect(IDS).toContain(c.owner);
          }
          for (const r of recorder.log) {
            if (r.msg.type === 'opApplied' || r.msg.type === 'gameOver') {
              for (const s of Object.values(r.msg.payload.scores)) {
                expect(s).toBeGreaterThanOrEqual(0);
              }
            }
          }
          const rejected = recorder.log.filter((r) => r.msg.type === 'opRejected');
          if (rejected.length > 0) {
            expect(rejected).toHaveLength(1);
            expect(recorder.log.filter((r) => r.msg.type === 'opApplied')).toHaveLength(0);
            expect(room.getCells()).toEqual(cellsBefore);
          }
          const status = room.getStatus();
          expect(!(prevStatus === 'won' && status === 'playing')).toBe(true);
          if (status === 'won') {
            for (const m of recorder.messagesFor(actor)) {
              if (m.type === 'opRejected') expect(m.payload.reason).toBe('game-over');
            }
          }
          prevStatus = status;
        }
      })
    );
  });
});

describe('SP-3 广播完整性与个性化', () => {
  it('非 note op 全房各 1 条 opApplied 且公共部分相同；note 仅发起者；拒绝仅发起者；opApplied 先于 gameOver', () => {
    fc.assert(
      fc.property(arbTwoPlayerScript(20), (script) => {
        const { room, recorder } = makeRoom([...IDS]);
        for (const step of script) {
          const actor = IDS[step.player];
          const others = IDS.filter((id) => id !== actor);
          recorder.clear();
          room.handleOp(actor, step.op);
          const stepLog = recorder.log.slice();
          const actorMsgs = stepLog.filter((r) => r.playerId === actor).map((r) => r.msg);
          const rejected = actorMsgs.filter((m) => m.type === 'opRejected');
          const applied = actorMsgs.filter((m) => m.type === 'opApplied' && sameOp(m.payload.op, step.op));
          if (rejected.length > 0) {
            expect(rejected).toHaveLength(1);
            expect(applied).toHaveLength(0);
            for (const other of others) {
              expect(stepLog.filter((r) => r.playerId === other)).toHaveLength(0);
            }
            continue;
          }
          if (applied.length === 0) continue;
          if (step.op.kind === 'note') {
            expect(applied).toHaveLength(1);
            if (applied[0].type === 'opApplied' && applied[0].payload.result === 'note') {
              expect(Array.isArray(applied[0].payload.notes)).toBe(true);
            }
            for (const other of others) {
              expect(stepLog.filter((r) => r.playerId === other)).toHaveLength(0);
            }
            continue;
          }
          expect(applied).toHaveLength(1);
          const copies: ServerMessage[] = [];
          for (const id of IDS) {
            const found = stepLog.filter(
              (r) => r.playerId === id && r.msg.type === 'opApplied' && sameOp(r.msg.payload.op, step.op)
            );
            expect(found).toHaveLength(1);
            copies.push(found[0].msg);
          }
          const strip = (m: ServerMessage): unknown => {
            if (m.type !== 'opApplied') return m;
            const { clearedNotes, notes, ...rest } = m.payload as Record<string, unknown>;
            return { type: m.type, payload: rest };
          };
          for (const c of copies.slice(1)) {
            expect(strip(c)).toEqual(strip(copies[0]));
          }
          for (const c of copies) {
            if (c.type !== 'opApplied') continue;
            const result = c.payload.result;
            const cleared = c.payload.clearedNotes;
            if (result === 'wrong' || result === 'erased') {
              expect(cleared).toBeUndefined();
            } else if (result === 'undone' || result === 'redone') {
              if (c.payload.playerId !== actor) {
                expect(cleared).toBeUndefined();
                expect(c.payload.notes).toBeUndefined();
              }
            } else if (result === 'correct') {
              if (cleared) {
                const peers = new Set(peerIndices(c.payload.cellIndex));
                for (const entry of cleared) expect(peers.has(entry.index)).toBe(true);
              }
            }
          }
          const appliedIdx = stepLog.findIndex(
            (r) => r.msg.type === 'opApplied' && sameOp(r.msg.payload.op, step.op)
          );
          const overIdx = stepLog.findIndex((r) => r.msg.type === 'gameOver');
          if (overIdx >= 0) {
            expect(appliedIdx).toBeGreaterThanOrEqual(0);
            expect(appliedIdx).toBeLessThan(overIdx);
            for (const id of IDS) {
              expect(stepLog.filter((r) => r.playerId === id && r.msg.type === 'gameOver')).toHaveLength(1);
            }
          }
        }
      })
    );
  });
});

describe('SP-4 undo 隔离性', () => {
  it('A undo 至栈空：B 的 owner 格 / notesByPlayer / ScoreState 不变', () => {
    const fillOrNote = arbTwoPlayerScript(20).map((script) =>
      script.filter((s) => s.op.kind === 'fill' || s.op.kind === 'note')
    );
    fc.assert(
      fc.property(fillOrNote, (script) => {
        const { room } = makeRoom([...IDS]);
        for (const step of script) {
          room.handleOp(IDS[step.player], step.op);
        }
        const bCellsBefore = new Map(
          room
            .getCells()
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c.owner === 'B')
            .map(({ c, i }) => [i, { value: c.value, wrong: c.wrong, owner: c.owner }])
        );
        const bNotesBefore = JSON.stringify(room.snapshotFor('B').yourNotes);
        const bScoreBefore = room.snapshotFor('B').players.find((p) => p.id === 'B')?.score ?? 0;
        const a = room.getPlayers().find((p) => p.playerId === 'A');
        expect(a).toBeDefined();
        while (a && a.undoStack.length > 0 && room.getStatus() === 'playing') {
          room.handleOp('A', { kind: 'undo' });
        }
        for (const [i, before] of bCellsBefore) {
          const now = room.getCells()[i];
          expect({ value: now.value, wrong: now.wrong, owner: now.owner }).toEqual(before);
        }
        expect(JSON.stringify(room.snapshotFor('B').yourNotes)).toBe(bNotesBefore);
        const bScoreAfter = room.snapshotFor('B').players.find((p) => p.id === 'B')?.score ?? 0;
        expect(bScoreAfter).toBe(bScoreBefore);
      })
    );
  });

  it('填对后 undo 返还联动清除的笔记（仅发起者自己）', () => {
    fc.assert(
      fc.property(fc.constantFrom(...emptyIndices()), (index) => {
        const { room } = makeRoom(['A']);
        const peers = emptyIndices().filter(
          (i) => i !== index && (Math.floor(i / 9) === Math.floor(index / 9) || i % 9 === index % 9)
        );
        if (peers.length === 0) return;
        const peer = peers[0];
        const fillValue = SOLUTION[index];
        room.handleOp('A', { kind: 'note', index: peer, value: fillValue });
        room.handleOp('A', { kind: 'fill', index, value: fillValue });
        expect(room.snapshotFor('A').yourNotes[peer]).toBeUndefined();
        room.handleOp('A', { kind: 'undo' });
        expect(room.getCells()[index].value).toBe(0);
        expect(room.snapshotFor('A').yourNotes[peer]).toContain(fillValue);
      })
    );
  });
});

describe('SP-5 forfeit 与回收', () => {
  it('playing && hadTwoPlayers：removePlayer → won + 在局者 gameOver(forfeit, winner=在局者) + 无 playerLeft', () => {
    fc.assert(
      fc.property(arbTwoPlayerScript(20), (script) => {
        const { room, recorder } = makeRoom([...IDS]);
        for (const step of script) {
          room.handleOp(IDS[step.player], step.op);
        }
        fc.pre(room.getStatus() === 'playing' && room.getPlayerCount() === 2);
        recorder.clear();
        room.removePlayer('B');
        expect(room.getStatus()).toBe('won');
        const over = opsOf(recorder.messagesFor('A'), 'gameOver');
        expect(over).toHaveLength(1);
        if (over[0].type !== 'gameOver') return;
        expect(over[0].payload.reason).toBe('forfeit');
        expect(over[0].payload.winnerId).toBe('A');
        expect(recorder.log.some((r) => r.msg.type === 'playerLeft')).toBe(false);
        expect(room.getPlayerCount()).toBe(1);
      })
    );
  });

  it('单人房离开回收：rooms 不再含该 roomId', () => {
    const recorder = makeSendRecorder();
    const manager = new RoomManager(recorder.send);
    const room = manager.createRoom('easy', 'rx');
    room.addPlayer('A');
    room.removePlayer('A');
    manager.reclaimIfEmpty('rx');
    expect(manager.getRoom('rx')).toBeUndefined();
    expect(manager.listRooms()).toHaveLength(0);
  });

  it('won 房成员离开 → 其余成员收 playerLeft', () => {
    const { room, recorder } = makeRoom([...IDS]);
    for (const i of emptyIndices()) {
      room.handleOp('A', { kind: 'fill', index: i, value: SOLUTION[i] });
    }
    expect(room.getStatus()).toBe('won');
    recorder.clear();
    room.removePlayer('B');
    const aMsgs = recorder.messagesFor('A');
    expect(opsOf(aMsgs, 'playerLeft')).toHaveLength(1);
    expect(room.getPlayerCount()).toBe(1);
  });

  it('won 房在线 0 → 回收', () => {
    const recorder = makeSendRecorder();
    const manager = new RoomManager(recorder.send);
    const room = manager.createRoom('medium', 'rx');
    room.addPlayer('A');
    room.addPlayer('B');
    room.removePlayer('B');
    expect(room.getStatus()).toBe('won');
    room.removePlayer('A');
    manager.reclaimIfEmpty('rx');
    expect(manager.getRoom('rx')).toBeUndefined();
    expect(manager.listRooms()).toHaveLength(0);
  });

  it('终局（forfeit）后 matchRoom 任意难度不命中', () => {
    const recorder = makeSendRecorder();
    const manager = new RoomManager(recorder.send);
    const room = manager.createRoom('medium', 'rx');
    room.addPlayer('A');
    room.addPlayer('B');
    room.removePlayer('B');
    expect(room.getStatus()).toBe('won');
    for (const d of ['easy', 'medium', 'hard', 'expert'] as const) {
      expect(manager.matchRoom(d)).toBeNull();
    }
  });
});
