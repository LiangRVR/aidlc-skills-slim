import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/core/types';
import type { CellEntry } from '../shared/protocol';
import { formatPlayerCount } from '../src/ui/ui-text';
import {
  arbOpAppliedStream,
  joinController,
  makeController,
  makeSnapshot,
} from './client-generators';

describe('CP-1 镜像一致性（Invariant）', () => {
  it('任意 opApplied 流后镜像与参考重放器逐格一致', () => {
    fc.assert(
      fc.property(arbOpAppliedStream(['me', 'op'], 20), (stream) => {
        const { oc, ws } = makeController();
        const snapshot = makeSnapshot('me', ['me', 'op']);
        ws.emitMessage({ type: 'joined', payload: snapshot });
        const ref: CellEntry[] = snapshot.cells.map((c) => ({ ...c, notes: [...c.notes] }));
        for (const msg of stream) {
          ws.emitMessage(msg);
          const p = msg.payload;
          if (p.result === 'correct' && p.op.kind === 'fill') {
            for (const idx of p.clearedNotes) {
              if (idx !== p.cellIndex && ref[idx].value === 0) {
                ref[idx].notes = ref[idx].notes.filter((n) => n !== (p.op as { value: number }).value);
              }
            }
          }
          ref[p.cellIndex] = { ...p.cell, notes: [...p.cell.notes] };
        }
        const board = oc.snapshot();
        for (let i = 0; i < 81; i++) {
          expect(board.board[i]).toBe(ref[i].value);
          expect(board.owners?.[i] ?? null).toBe(ref[i].owner);
          expect(board.wrongCells.has(i)).toBe(ref[i].wrong);
          expect([...board.notes[i]].sort()).toEqual([...ref[i].notes].sort((a, b) => a - b));
        }
      })
    );
  });
});

describe('CP-2 VFX 隔离派发（Oracle）', () => {
  it('VFX_CORRECT ⟺ result=correct 且 playerId=you；completedUnits 与载荷一致', () => {
    fc.assert(
      fc.property(arbOpAppliedStream(['me', 'op'], 10), (stream) => {
        const { bus, oc, ws } = makeController();
        joinController(oc, ws, 'me', ['me', 'op']);
        const vfx: { index: number; completedUnits: string[] }[] = [];
        bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p as { index: number; completedUnits: string[] }));
        for (const msg of stream) {
          vfx.length = 0;
          ws.emitMessage(msg);
          const p = msg.payload;
          const shouldFire = p.result === 'correct' && p.playerId === 'me';
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

describe('CP-3 capabilities 与只读（Invariant）', () => {
  it('任意状态下 capabilities 恒全 false；isReadOnly ⟺ 自己旁观或断线', () => {
    const arbEvent = fc.array(
      fc.oneof(
        fc.constant('lost-me' as const),
        fc.constant('lost-op' as const),
        fc.constant('close' as const)
      ),
      { maxLength: 6 }
    );
    fc.assert(
      fc.property(arbEvent, (events) => {
        const { oc, ws } = makeController();
        joinController(oc, ws, 'me', ['me', 'op']);
        let spectating = false;
        let disconnected = false;
        for (const e of events) {
          if (e === 'lost-me') {
            ws.emitMessage({ type: 'playerLost', payload: { playerId: 'me' } });
            spectating = true;
          } else if (e === 'lost-op') {
            ws.emitMessage({ type: 'playerLost', payload: { playerId: 'op' } });
          } else {
            ws.emitClose();
            disconnected = true;
          }
          expect(oc.capabilities()).toEqual({ hint: false, reset: false, newGame: false });
          expect(oc.isReadOnly()).toBe(spectating || disconnected);
        }
      })
    );
  });
});

describe('CP-4 人数徽标驱动（Oracle）', () => {
  it('任意 join/leave 序列后 getPlayerCount===镜像 players.length 且格式为"在线 n/2"', () => {
    const arbMembership = fc.array(
      fc.record({
        action: fc.constantFrom('join' as const, 'leave' as const),
        id: fc.constantFrom('op1' as const, 'op2' as const, 'op3' as const),
      }),
      { maxLength: 6 }
    );
    fc.assert(
      fc.property(arbMembership, (events) => {
        const { oc, ws } = makeController();
        joinController(oc, ws, 'me', ['me']);
        const ref = new Set<string>(['me']);
        for (const e of events) {
          if (e.action === 'join') {
            ws.emitMessage({ type: 'playerJoined', payload: { player: { id: e.id, mistakes: 0, spectating: false } } });
            ref.add(e.id);
          } else {
            ws.emitMessage({ type: 'playerLeft', payload: { playerId: e.id } });
            ref.delete(e.id);
          }
          expect(oc.getPlayerCount()).toBe(ref.size);
          expect(formatPlayerCount(oc.getPlayerCount())).toBe(`在线 ${ref.size}/2`);
        }
      })
    );
  });
});
