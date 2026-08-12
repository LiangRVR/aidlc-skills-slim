import { describe, expect, it, vi } from 'vitest';
import { EVENTS } from '../src/core/types';
import { EventBus } from '../src/core/event-bus';
import { LocalGameController } from '../src/core/game-controller';
import { WebSocketClient } from '../src/net/ws-client';
import { ONLINE_SCORES_EVENT } from '../src/net/online-game-controller';
import { deserialize, serialize } from '../shared/protocol';
import type { CompletedUnit, ServerMessage } from '../shared/protocol';
import { formatPlayerCount } from '../src/ui/ui-text';
import { emptyIndices, givenIndices, GIVENS, SOLUTION, wrongValue } from './server-generators';
import { joinController, makeController } from './client-generators';

const empties = emptyIndices();

const fillApplied = (playerId: string, index: number, value: number, result: 'correct' | 'wrong') => ({
  type: 'opApplied' as const,
  payload: {
    playerId,
    op: { kind: 'fill' as const, index, value },
    result,
    cellIndex: index,
    cell: { value, given: false, owner: playerId, wrong: result === 'wrong' },
    completedUnits: [] as CompletedUnit[],
    scores: { me: 1, op: 0 },
    clearedNotes: [],
  },
});

describe('OnlineGameController example-based scenarios（PBT-10 互补）', () => {
  it('1. joined 初始化渲染：81 格 owners、you、ownNotes=yourNotes、Badge、ScoreBoard 初始分', () => {
    const { bus, oc, ws } = makeController();
    const noteIndex = empties[0];
    const updates: { scores: Record<string, number>; you: string }[] = [];
    bus.on(ONLINE_SCORES_EVENT, (p) => updates.push(p as { scores: Record<string, number>; you: string }));
    expect(oc.isInitialized()).toBe(false);
    joinController(oc, ws, 'me', 'op', { [noteIndex]: [1, 2] });
    expect(oc.isInitialized()).toBe(true);
    const snap = oc.snapshot();
    expect(snap.you).toBe('me');
    expect(snap.owners).toHaveLength(81);
    expect(snap.board).toEqual(GIVENS);
    expect(snap.isGiven(givenIndices()[0])).toBe(true);
    expect(snap.isGiven(emptyIndices()[0])).toBe(false);
    expect(snap.isGiven(noteIndex)).toBe(false);
    expect(snap.notes[noteIndex]).toEqual([1, 2]);
    expect(oc.getPlayerCount()).toBe(2);
    expect(formatPlayerCount(oc.getPlayerCount())).toBe('在线 2/2');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({ scores: { me: 0, op: 0 }, you: 'me' });
  });

  it('2. 自己填对：VFX 1 次且 completedUnits 透传；镜像 owner=自己；ScoreBoard 更新为 scores', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws, 'me', 'op');
    const vfx: { index: number; completedUnits: string[] }[] = [];
    const updates: { scores: Record<string, number>; you: string }[] = [];
    bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p as { index: number; completedUnits: string[] }));
    bus.on(ONLINE_SCORES_EVENT, (p) => updates.push(p as { scores: Record<string, number>; you: string }));
    const target = empties[0];
    const value = SOLUTION[target];
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        ...fillApplied('me', target, value, 'correct').payload,
        completedUnits: [{ type: 'row', index: 0 }],
        scores: { me: 10, op: 4 },
      },
    });
    expect(vfx).toHaveLength(1);
    expect(vfx[0]).toEqual({ index: target, completedUnits: ['row'] });
    const snap = oc.snapshot();
    expect(snap.owners?.[target]).toBe('me');
    expect(snap.board[target]).toBe(value);
    expect(snap.wrongCells.has(target)).toBe(false);
    expect(updates[updates.length - 1]).toEqual({ scores: { me: 10, op: 4 }, you: 'me' });
  });

  it('3. 对方填对：无 VFX；该格 owner=对方；ScoreBoard 对方分数变化', () => {
    const { bus, oc, ws } = makeController();
    const vfx: unknown[] = [];
    const updates: { scores: Record<string, number>; you: string }[] = [];
    bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p));
    bus.on(ONLINE_SCORES_EVENT, (p) => updates.push(p as { scores: Record<string, number>; you: string }));
    joinController(oc, ws, 'me', 'op');
    const target = empties[1];
    ws.emitMessage({
      type: 'opApplied',
      payload: { ...fillApplied('op', target, SOLUTION[target], 'correct').payload, scores: { me: 0, op: 5 } },
    });
    expect(vfx).toHaveLength(0);
    expect(oc.snapshot().owners?.[target]).toBe('op');
    expect(updates[0].scores.op).toBe(0);
    expect(updates[updates.length - 1]).toEqual({ scores: { me: 0, op: 5 }, you: 'me' });
  });

  it('4. 笔记私有：result=note 副本整格替换 ownNotes；渲染快照 notes 同步', () => {
    const { oc, ws } = makeController();
    const noteIndex = empties[0];
    joinController(oc, ws, 'me', 'op', { [noteIndex]: [1, 2] });
    expect(oc.snapshot().notes[noteIndex]).toEqual([1, 2]);
    // 整格替换：[1,2] → [5]（非并集）
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        playerId: 'me',
        op: { kind: 'note', index: noteIndex, value: 5 },
        result: 'note',
        scores: { me: 0, op: 0 },
        notes: [5],
      },
    });
    expect(oc.snapshot().notes[noteIndex]).toEqual([5]);
    // 空 notes → 移除该格笔记
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        playerId: 'me',
        op: { kind: 'note', index: noteIndex, value: 6 },
        result: 'note',
        scores: { me: 0, op: 0 },
        notes: [],
      },
    });
    expect(oc.snapshot().notes[noteIndex]).toEqual([]);
  });

  it('5. 笔记代清：clearedNotes 条目只移除对应数字，同格其余笔记保留（回归：填 6 不得清掉笔记 5）', () => {
    const { oc, ws } = makeController();
    const a = empties[0];
    const b = empties[1];
    const c = empties[2];
    joinController(oc, ws, 'me', 'op', { [a]: [5, 6], [b]: [3] });
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        ...fillApplied('op', c, SOLUTION[c], 'correct').payload,
        clearedNotes: [
          { index: a, value: 6 },
          { index: c, value: SOLUTION[c] },
        ],
      },
    });
    const snap = oc.snapshot();
    expect(snap.notes[a]).toEqual([5]);
    expect(snap.notes[b]).toEqual([3]);
  });

  it('5b. undo 笔记恢复：undone 的 clearedNotes 条目把对应数字加回 ownNotes', () => {
    const { oc, ws } = makeController();
    const a = empties[0];
    const b = empties[1];
    joinController(oc, ws, 'me', 'op', { [a]: [5] });
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        playerId: 'me',
        op: { kind: 'undo' },
        result: 'undone',
        cellIndex: b,
        cell: { value: 0, given: false, owner: null, wrong: false },
        scores: { me: 0, op: 0 },
        clearedNotes: [
          { index: a, value: 6 },
          { index: a, value: 9 },
        ],
      },
    });
    expect(oc.snapshot().notes[a]).toEqual([5, 6, 9]);
  });

  it('6. 错填覆盖：对方 wrong 格经自己 correct opApplied 后 owner=自己、wrong=false', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws, 'me', 'op');
    const vfx: unknown[] = [];
    bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p));
    const target = empties[0];
    const wrong = wrongValue(target);
    ws.emitMessage(fillApplied('op', target, wrong, 'wrong'));
    expect(oc.snapshot().owners?.[target]).toBe('op');
    expect(oc.snapshot().wrongCells.has(target)).toBe(true);
    ws.emitMessage(fillApplied('me', target, SOLUTION[target], 'correct'));
    const snap = oc.snapshot();
    expect(snap.owners?.[target]).toBe('me');
    expect(snap.wrongCells.has(target)).toBe(false);
    expect(snap.board[target]).toBe(SOLUTION[target]);
    expect(vfx).toHaveLength(1);
  });

  it('7. gameOver completed 胜：GameOverData 透传（winnerId=you 驱动"你赢了"）；isReadOnly=true；停表', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws, 'me', 'op');
    const won: unknown[] = [];
    bus.on(EVENTS.GAME_WON, (p) => won.push(p));
    ws.emitMessage({
      type: 'gameOver',
      payload: { winnerId: 'me', reason: 'completed', scores: { me: 100, op: 60 }, elapsedSeconds: 245 },
    });
    expect(oc.getGameOverData()).toEqual({
      winnerId: 'me',
      reason: 'completed',
      scores: { me: 100, op: 60 },
      elapsedSeconds: 245,
    });
    expect(oc.getStatus()).toBe('won');
    expect(oc.isReadOnly()).toBe(true);
    expect(oc.getElapsedSeconds()).toBe(245);
    expect(won).toHaveLength(1);
  });

  it('8. gameOver completed 平局：winnerId=null 驱动"平局"；数据透传', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws, 'me', 'op');
    ws.emitMessage({
      type: 'gameOver',
      payload: { winnerId: null, reason: 'completed', scores: { me: 50, op: 50 }, elapsedSeconds: 300 },
    });
    const data = oc.getGameOverData();
    expect(data?.winnerId).toBeNull();
    expect(data?.reason).toBe('completed');
    expect(data?.scores).toEqual({ me: 50, op: 50 });
    expect(data?.elapsedSeconds).toBe(300);
    expect(oc.isReadOnly()).toBe(true);
  });

  it('9. gameOver forfeit：reason=forfeit 驱动"对方已离开"；winnerId=对方；数据透传', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws, 'me', 'op');
    ws.emitMessage({
      type: 'gameOver',
      payload: { winnerId: 'op', reason: 'forfeit', scores: { me: 0, op: 10 }, elapsedSeconds: 90 },
    });
    const data = oc.getGameOverData();
    expect(data?.reason).toBe('forfeit');
    expect(data?.winnerId).toBe('op');
    expect(data?.winnerId).not.toBe(oc.snapshot().you);
    expect(data?.elapsedSeconds).toBe(90);
    expect(oc.isReadOnly()).toBe(true);
  });

  it('10. 断线只读：onClose → CONNECTION_LOST + isReadOnly=true；输入不再发消息；主动离开不触发断线态', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws);
    const lost: unknown[] = [];
    bus.on(EVENTS.CONNECTION_LOST, (p) => lost.push(p));
    ws.emitClose();
    expect(lost).toHaveLength(1);
    expect(oc.isReadOnly()).toBe(true);
    const sentBefore = ws.sent.length;
    oc.selectCell(empties[0]);
    oc.inputDigit(5);
    oc.undo();
    expect(ws.sent.length).toBe(sentBefore);
    // 主动 leave 后的 close 不视为断线
    const { oc: oc2, ws: ws2 } = makeController();
    joinController(oc2, ws2);
    oc2.leave();
    ws2.emitClose();
    expect(oc2.isReadOnly()).toBe(false);
  });

  it('11. opRejected（空栈 undo）：镜像无变化、无异常；后续 op 仍正常应用', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws);
    const before = oc.snapshot().board.slice();
    ws.emitMessage({ type: 'opRejected', payload: { playerId: 'me', reason: 'nothing-to-undo' } });
    expect(oc.snapshot().board).toEqual(before);
    const target = empties[0];
    ws.emitMessage(fillApplied('me', target, SOLUTION[target], 'correct'));
    expect(oc.snapshot().owners?.[target]).toBe('me');
  });

  it('12. 非法帧：ws onMessage 不回调（deserialize 拒绝非法/旧版/未知类型帧）', async () => {
    let fakeWs: FakeWebSocket | null = null;
    class FakeWebSocket {
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        fakeWs = this;
        setTimeout(() => this.onopen?.(), 0);
      }
      close(): void {}
      send(): void {}
    }
    vi.stubGlobal('WebSocket', FakeWebSocket);
    try {
      expect(deserialize('{broken json')).toBeNull();
      const client = new WebSocketClient();
      const received: ServerMessage[] = [];
      client.onMessage((m) => received.push(m));
      await client.connect('ws://localhost:8081');
      expect(fakeWs).not.toBeNull();
      const emit = (raw: string): void => fakeWs!.onmessage?.({ data: raw });
      emit('{broken json');
      emit(JSON.stringify({ version: 2, type: 'opApplied', payload: { result: 'maybe' } }));
      emit(JSON.stringify({ version: 1, type: 'error', payload: { message: 'old' } }));
      emit(JSON.stringify({ version: 2, type: 'playerLost', payload: { playerId: 'me' } }));
      expect(received).toHaveLength(0);
      emit(serialize({ type: 'error', payload: { message: 'hi' } }));
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ type: 'error', payload: { message: 'hi' } });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('13. FR-40 回归门禁：本地模式零行为变更（由既有本地测试套件承担）', () => {
    // 本地模式路径行为变更门禁由既有本地测试（game-state / rule-validator 等）保持绿色承担；
    // 此处仅做架构隔离冒烟：LocalGameController 与联机控制器 capabilities/只读语义互不影响。
    const local = new LocalGameController(new EventBus());
    expect(local.capabilities()).toEqual({ hint: true, reset: true, newGame: true });
    expect(local.isReadOnly()).toBe(false);
  });
});
