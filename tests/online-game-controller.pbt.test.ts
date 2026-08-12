import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/core/types';
import type { CellEntry } from '../shared/protocol';
import { ONLINE_SCORES_EVENT } from '../src/net/online-game-controller';
import { formatPlayerCount } from '../src/ui/ui-text';
import {
  arbClientSnapshot,
  arbOpAppliedFor,
  arbOpAppliedStream,
  joinController,
  makeController,
  mirrorOf,
} from './client-generators';

describe('CP-1 镜像一致性（Invariant）', () => {
  it('任意个性化 opApplied 流：cells 参考重放 + ownNotes 独立重放逐格相等；ownNotes 键仅在 value===0 格', () => {
    fc.assert(
      fc.property(arbClientSnapshot('me', 'op'), arbOpAppliedStream('me', 'op', 20), (snapshot, stream) => {
        const { oc, ws } = makeController();
        ws.emitMessage({ type: 'joined', payload: snapshot });
        // 参考实现：公共字段重放 + ownNotes 独立重放
        const cellsRef: CellEntry[] = snapshot.cells.map((c) => ({ ...c }));
        const notesRef = new Map<number, Set<number>>();
        for (const k of Object.keys(snapshot.yourNotes)) {
          const index = Number(k);
          notesRef.set(index, new Set(snapshot.yourNotes[index]));
        }
        for (const msg of stream) {
          ws.emitMessage(msg);
          const p = msg.payload;
          if (p.result === 'note') {
            if (p.op.kind === 'note') {
              if (p.notes.length === 0) notesRef.delete(p.op.index);
              else notesRef.set(p.op.index, new Set(p.notes));
            }
          } else {
            cellsRef[p.cellIndex] = { ...p.cell };
            if (p.cell.value !== 0) notesRef.delete(p.cellIndex);
          }
          if (p.clearedNotes) {
            for (const entry of p.clearedNotes) {
              if (p.result === 'undone') {
                if (cellsRef[entry.index].value !== 0) continue;
                const s = notesRef.get(entry.index) ?? new Set<number>();
                s.add(entry.value);
                notesRef.set(entry.index, s);
              } else {
                const s = notesRef.get(entry.index);
                if (s) {
                  s.delete(entry.value);
                  if (s.size === 0) notesRef.delete(entry.index);
                }
              }
            }
          }
        }
        const snap = oc.snapshot();
        for (let i = 0; i < 81; i++) {
          expect(snap.board[i]).toBe(cellsRef[i].value);
          expect(snap.owners?.[i] ?? null).toBe(cellsRef[i].owner);
          expect(snap.wrongCells.has(i)).toBe(cellsRef[i].wrong);
          expect(snap.isGiven(i)).toBe(cellsRef[i].given);
          const expected = notesRef.get(i) ?? new Set<number>();
          expect([...snap.notes[i]].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
          if (cellsRef[i].value !== 0) expect(snap.notes[i]).toEqual([]);
        }
        // 镜像永不含非法 CellEntry；cells 无 notes 字段
        const mirror = mirrorOf(oc);
        for (const cell of mirror.cells) {
          expect(Object.prototype.hasOwnProperty.call(cell, 'notes')).toBe(false);
          expect(cell.value).toBeGreaterThanOrEqual(0);
          expect(cell.value).toBeLessThanOrEqual(9);
          if (cell.value === 0) expect(cell.wrong).toBe(false);
        }
        // ownNotes 键只出现在 value===0 的格子上
        for (const [index] of mirror.ownNotes) {
          expect(mirror.cells[index].value).toBe(0);
        }
        // players 与消息流一致：score 与最近一条 opApplied.scores 一致
        const lastScores = stream.length > 0 ? stream[stream.length - 1].payload.scores : null;
        if (lastScores) {
          for (const player of mirror.players) {
            if (lastScores[player.id] !== undefined) expect(player.score).toBe(lastScores[player.id]);
          }
        }
        expect(oc.getPlayerCount()).toBe(mirror.players.length);
      })
    );
  });
});

describe('CP-2 VFX 隔离派发（Oracle）', () => {
  it('VFX_CORRECT ⟺ result=correct 且 playerId=自己；completedUnits 透传一致', () => {
    fc.assert(
      fc.property(arbOpAppliedStream('me', 'op', 10), (stream) => {
        const { bus, oc, ws } = makeController();
        joinController(oc, ws, 'me', 'op');
        const vfx: { index: number; completedUnits: string[] }[] = [];
        bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p as { index: number; completedUnits: string[] }));
        for (const msg of stream) {
          vfx.length = 0;
          ws.emitMessage(msg);
          const p = msg.payload;
          const shouldFire = p.playerId === 'me' && p.result === 'correct';
          if (shouldFire) {
            expect(vfx).toHaveLength(1);
            expect(vfx[0].index).toBe(p.cellIndex);
            expect(vfx[0].completedUnits).toEqual(p.completedUnits.map((u) => u.type));
          } else {
            expect(vfx).toHaveLength(0);
          }
        }
      })
    );
  });
});

describe('CP-3 capabilities 与只读纯函数性（Invariant）', () => {
  it('任意联机消息序列下 capabilities 恒 {hint:false,reset:false,newGame:false}；isReadOnly ⟺ disconnected||status=won', () => {
    const arbSeq = fc.array(
      fc.oneof(
        fc.constant('close' as const),
        fc.constant('gameOver' as const),
        fc.constant('playerJoined' as const),
        fc.constant('playerLeft' as const),
        fc.constant('opRejected' as const),
        fc.constant('error' as const),
        arbOpAppliedFor('me', 'op')
      ),
      { maxLength: 10 }
    );
    fc.assert(
      fc.property(arbSeq, (seq) => {
        const { oc, ws } = makeController();
        joinController(oc, ws, 'me', 'op');
        let disconnected = false;
        let won = false;
        for (const e of seq) {
          if (e === 'close') {
            ws.emitClose();
            disconnected = true;
          } else if (e === 'gameOver') {
            ws.emitMessage({
              type: 'gameOver',
              payload: { winnerId: 'me', reason: 'completed', scores: { me: 1, op: 0 }, elapsedSeconds: 5 },
            });
            won = true;
          } else if (e === 'playerJoined') {
            ws.emitMessage({ type: 'playerJoined', payload: { player: { id: 'op2', score: 0 } } });
          } else if (e === 'playerLeft') {
            ws.emitMessage({ type: 'playerLeft', payload: { playerId: 'op' } });
          } else if (e === 'opRejected') {
            ws.emitMessage({ type: 'opRejected', payload: { playerId: 'me', reason: 'x' } });
          } else if (e === 'error') {
            ws.emitMessage({ type: 'error', payload: { message: 'x' } });
          } else {
            ws.emitMessage(e);
          }
          expect(oc.capabilities()).toEqual({ hint: false, reset: false, newGame: false });
          expect(oc.isReadOnly()).toBe(disconnected || won);
        }
      })
    );
  });
});

describe('CP-4 人数徽标驱动（Oracle）', () => {
  it('任意 joined/playerJoined/playerLeft 序列后 getPlayerCount===players.length 且 n∈{1,2}；gameOver/opApplied 不改变 n', () => {
    const arbSeq = fc.array(
      fc.oneof(
        fc.constant('join' as const),
        fc.constant('leave' as const),
        fc.constant('op' as const),
        fc.constant('gameOver' as const)
      ),
      { maxLength: 10 }
    );
    fc.assert(
      fc.property(arbSeq, (seq) => {
        const { oc, ws } = makeController();
        joinController(oc, ws, 'me', null);
        const ref = new Set<string>(['me']);
        for (const e of seq) {
          if (e === 'join') {
            ws.emitMessage({ type: 'playerJoined', payload: { player: { id: 'op', score: 0 } } });
            ref.add('op');
          } else if (e === 'leave') {
            ws.emitMessage({ type: 'playerLeft', payload: { playerId: 'op' } });
            ref.delete('op');
          } else if (e === 'op') {
            ws.emitMessage({
              type: 'opApplied',
              payload: {
                playerId: 'me',
                op: { kind: 'fill', index: 0, value: 1 },
                result: 'correct',
                cellIndex: 0,
                cell: { value: 1, given: false, owner: 'me', wrong: false },
                completedUnits: [],
                scores: { me: 1, op: 0 },
              },
            });
          } else {
            ws.emitMessage({
              type: 'gameOver',
              payload: { winnerId: 'me', reason: 'completed', scores: { me: 1, op: 0 }, elapsedSeconds: 5 },
            });
          }
          expect(oc.getPlayerCount()).toBe(ref.size);
          expect(ref.size === 1 || ref.size === 2).toBe(true);
          expect(formatPlayerCount(oc.getPlayerCount())).toBe(`在线 ${ref.size}/2`);
        }
      })
    );
  });
});

describe('CP-5 分数镜像与笔记私有（Oracle+Invariant）', () => {
  it('ScoreBoard 最近 update 载荷===最近 opApplied.scores；cells 结构性无 notes；note 整格替换', () => {
    fc.assert(
      fc.property(arbOpAppliedStream('me', 'op', 15), (stream) => {
        const { bus, oc, ws } = makeController();
        joinController(oc, ws, 'me', 'op');
        const updates: { scores: Record<string, number>; you: string }[] = [];
        bus.on(ONLINE_SCORES_EVENT, (p) => updates.push(p as { scores: Record<string, number>; you: string }));
        for (const msg of stream) {
          ws.emitMessage(msg);
          // Oracle：最近一次 ScoreBoard update === 本条 opApplied.scores
          expect(updates[updates.length - 1].scores).toEqual(msg.payload.scores);
          expect(updates[updates.length - 1].you).toBe('me');
          // note 整格替换语义：result=note → 快照 notes 与 notes 全集严格相等
          const p = msg.payload;
          if (p.result === 'note' && p.op.kind === 'note') {
            const snap = oc.snapshot();
            expect([...snap.notes[p.op.index]].sort((a, b) => a - b)).toEqual([...p.notes].sort((a, b) => a - b));
          }
        }
        // Invariant：镜像 cells 无 notes 字段（除 ownNotes 外无任何笔记载体）
        const mirror = mirrorOf(oc);
        for (const cell of mirror.cells) {
          expect(Object.prototype.hasOwnProperty.call(cell, 'notes')).toBe(false);
        }
        // ownNotes 与渲染快照 notes 投影一致
        const snap = oc.snapshot();
        for (const [index, set] of mirror.ownNotes) {
          expect([...snap.notes[index]].sort((a, b) => a - b)).toEqual([...set].sort((a, b) => a - b));
        }
      })
    );
  });
});
