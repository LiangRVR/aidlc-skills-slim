import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Op } from '../shared/protocol';
import { arbTwoPlayerScript, emptyIndices, makeRoom, SOLUTION } from './server-generators';

const IDS = ['A', 'B'] as const;

const sameOp = (a: Op, b: Op): boolean => JSON.stringify(a) === JSON.stringify(b);

describe('SP-2 房间状态机不变量（任意双人 op 脚本驱动）', () => {
  it('每步后 CellEntry 一致性 / 计数与旁观一致 / 观战拒绝无副作用 / 状态单向 / wrong 格有界', () => {
    fc.assert(
      fc.property(arbTwoPlayerScript(30), (script) => {
        const { room, recorder } = makeRoom([...IDS]);
        let prevStatus = room.getStatus();
        for (const step of script) {
          const actor = IDS[step.player];
          const wasSpectating = room.getPlayers().find((p) => p.playerId === actor)?.spectating ?? false;
          const cellsBefore = room.getCells();
          recorder.clear();
          expect(() => room.handleOp(actor, step.op)).not.toThrow();
          const cells = room.getCells();
          for (let i = 0; i < 81; i++) {
            const c = cells[i];
            if (c.given) {
              expect(c.owner).toBeNull();
              expect(c.value).not.toBe(0);
            }
            if (c.value === 0) expect(c.wrong).toBe(false);
            if (c.value !== 0 && !c.given) expect(IDS).toContain(c.owner);
          }
          for (const p of room.getPlayers()) {
            expect(p.mistakes).toBeGreaterThanOrEqual(0);
            expect(p.mistakes).toBeLessThanOrEqual(3);
            expect(p.spectating).toBe(p.mistakes >= 3);
          }
          if (wasSpectating) {
            const msgs = recorder.messagesFor(actor);
            expect(msgs).toHaveLength(1);
            expect(msgs[0].type === 'opRejected' && msgs[0].payload.reason).toBe('spectating');
            expect(cells).toEqual(cellsBefore);
          }
          const status = room.getStatus();
          expect(!(prevStatus === 'won' && status === 'playing')).toBe(true);
          if (status === 'won') {
            const msgs = recorder.messagesFor(actor);
            for (const m of msgs) {
              expect(m.type === 'opRejected' && m.payload.reason).toBe('game-over');
            }
          }
          prevStatus = status;
          const wrongCount = cells.filter((c) => c.wrong).length;
          expect(wrongCount).toBeLessThanOrEqual(6);
        }
      })
    );
  });
});

describe('SP-3 广播完整性（计数 / 目标 / 顺序）', () => {
  it('接受的 op 全房各 1 条 opApplied；拒绝的 op 仅发起者 1 条 opRejected；playerLost/gameWon 在 opApplied 之后', () => {
    fc.assert(
      fc.property(arbTwoPlayerScript(30), (script) => {
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
          } else if (applied.length > 0) {
            expect(applied).toHaveLength(1);
            for (const other of others) {
              const otherMsgs = stepLog.filter((r) => r.playerId === other).map((r) => r.msg);
              expect(otherMsgs.filter((m) => m.type === 'opApplied' && sameOp(m.payload.op, step.op))).toHaveLength(1);
            }
            const appliedIdx = stepLog.findIndex((r) => r.msg.type === 'opApplied' && sameOp(r.msg.payload.op, step.op));
            for (const t of ['playerLost', 'gameWon'] as const) {
              const idx = stepLog.findIndex((r) => r.msg.type === t);
              if (idx >= 0) expect(idx).toBeGreaterThan(appliedIdx);
            }
          }
        }
      })
    );
  });
});

describe('SP-4 undo 隔离性', () => {
  it('A undo 至栈空后，B 的 owner 格（value/wrong/owner）不变', () => {
    const fillOrNote = arbTwoPlayerScript(30).map((script) =>
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
        const a = room.getPlayers().find((p) => p.playerId === 'A');
        expect(a).toBeDefined();
        while (a && a.undoStack.length > 0 && !a.spectating) {
          room.handleOp('A', { kind: 'undo' });
        }
        for (const [i, before] of bCellsBefore) {
          const now = room.getCells()[i];
          expect({ value: now.value, wrong: now.wrong, owner: now.owner }).toEqual(before);
        }
      })
    );
  });

  it('填对后 undo 返还联动清除的笔记（主格 opApplied + 附加 note 广播）', () => {
    fc.assert(
      fc.property(fc.constantFrom(...emptyIndices()), fc.integer({ min: 1, max: 9 }), (index, noteValue) => {
        const { room } = makeRoom(['A']);
        const peers = emptyIndices().filter(
          (i) => i !== index && (Math.floor(i / 9) === Math.floor(index / 9) || i % 9 === index % 9)
        );
        if (peers.length === 0) return;
        const peer = peers[0];
        const fillValue = SOLUTION[index];
        room.handleOp('A', { kind: 'note', index: peer, value: fillValue });
        room.handleOp('A', { kind: 'fill', index, value: fillValue });
        expect(room.getCells()[peer].notes).not.toContain(fillValue);
        room.handleOp('A', { kind: 'undo' });
        expect(room.getCells()[index].value).toBe(0);
        expect(room.getCells()[peer].notes).toContain(fillValue);
        expect(noteValue).toBeGreaterThan(0);
      })
    );
  });
});
