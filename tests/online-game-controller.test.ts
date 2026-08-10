import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/core/types';
import { emptyIndices, SOLUTION, wrongValue } from './server-generators';
import { joinController, makeController, makeSnapshot } from './client-generators';

const empties = emptyIndices();

const fillApplied = (playerId: string, index: number, value: number, result: 'correct' | 'wrong') => ({
  type: 'opApplied' as const,
  payload: {
    playerId,
    op: { kind: 'fill' as const, index, value },
    result,
    cellIndex: index,
    cell: { value, given: false, owner: playerId, wrong: result === 'wrong', notes: [] },
    clearedNotes: [],
    completedUnits: [],
  },
});

describe('OnlineGameController example-based scenarios', () => {
  it('1. joined 初始化渲染：snapshot 含 81 格 owners 与 you，棋盘值与快照一致', () => {
    const { oc, ws } = makeController();
    expect(oc.isInitialized()).toBe(false);
    joinController(oc, ws, 'me', ['me', 'op']);
    expect(oc.isInitialized()).toBe(true);
    const snap = oc.snapshot();
    expect(snap.you).toBe('me');
    expect(snap.owners).toHaveLength(81);
    expect(snap.board[0]).toBe(5);
    expect(snap.isGiven(0)).toBe(true);
    expect(snap.isGiven(empties[0])).toBe(false);
    expect(oc.getPlayerCount()).toBe(2);
    expect(oc.getMyMistakes()).toBe(0);
  });

  it('2. 自己填对：VFX_CORRECT 派发一次且 completedUnits 透传；镜像 owner=me', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws);
    const vfx: unknown[] = [];
    bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p));
    const target = empties[0];
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        ...fillApplied('me', target, SOLUTION[target], 'correct').payload,
        completedUnits: [{ type: 'row', index: 0 }],
      },
    });
    expect(vfx).toHaveLength(1);
    expect(vfx[0]).toEqual({ index: target, completedUnits: ['row'] });
    const cell = oc.snapshot();
    expect(cell.owners?.[target]).toBe('me');
    expect(cell.board[target]).toBe(SOLUTION[target]);
  });

  it('3. 对方填对：无 VFX；快照 owners 为对方 id', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws, 'me', ['me', 'op']);
    const vfx: unknown[] = [];
    bus.on(EVENTS.VFX_CORRECT, (p) => vfx.push(p));
    const target = empties[1];
    ws.emitMessage(fillApplied('op', target, SOLUTION[target], 'correct'));
    expect(vfx).toHaveLength(0);
    expect(oc.snapshot().owners?.[target]).toBe('op');
  });

  it('4. 自己错满旁观：playerLost(me) → isReadOnly；inputDigit 不再发送消息', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws);
    ws.emitMessage({ type: 'playerLost', payload: { playerId: 'me' } });
    expect(oc.isReadOnly()).toBe(true);
    expect(oc.isSelfSpectating()).toBe(true);
    const sentBefore = ws.sent.length;
    oc.selectCell(empties[0]);
    oc.inputDigit(5);
    oc.undo();
    expect(ws.sent.length).toBe(sentBefore);
  });

  it('5. 对方离开/补位：playerJoined → playerLeft → playerJoined，人数 2→1→2，事件齐备', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws);
    const joinedEvents: unknown[] = [];
    const leftEvents: unknown[] = [];
    bus.on(EVENTS.ONLINE_PLAYER_JOINED, (p) => joinedEvents.push(p));
    bus.on(EVENTS.ONLINE_PLAYER_LEFT, (p) => leftEvents.push(p));
    expect(oc.getPlayerCount()).toBe(1);
    ws.emitMessage({ type: 'playerJoined', payload: { player: { id: 'op', mistakes: 0, spectating: false } } });
    expect(oc.getPlayerCount()).toBe(2);
    ws.emitMessage({ type: 'playerLeft', payload: { playerId: 'op' } });
    expect(oc.getPlayerCount()).toBe(1);
    ws.emitMessage({ type: 'playerJoined', payload: { player: { id: 'op2', mistakes: 0, spectating: false } } });
    expect(oc.getPlayerCount()).toBe(2);
    expect(joinedEvents).toHaveLength(2);
    expect(leftEvents).toHaveLength(1);
  });

  it('6. gameWon：status=won，wonElapsed 与消息一致', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws);
    const wonEvents: unknown[] = [];
    bus.on(EVENTS.GAME_WON, (p) => wonEvents.push(p));
    ws.emitMessage({ type: 'gameWon', payload: { elapsedSeconds: 245 } });
    expect(oc.getStatus()).toBe('won');
    expect(oc.getWonElapsedSeconds()).toBe(245);
    expect(wonEvents).toHaveLength(1);
  });

  it('7. 断线：onClose → CONNECTION_LOST + isReadOnly', () => {
    const { bus, oc, ws } = makeController();
    joinController(oc, ws);
    const lost: unknown[] = [];
    bus.on(EVENTS.CONNECTION_LOST, (p) => lost.push(p));
    ws.emitClose();
    expect(lost).toHaveLength(1);
    expect(oc.isReadOnly()).toBe(true);
  });

  it('8. opRejected：镜像无变化', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws);
    const before = oc.snapshot().board.slice();
    ws.emitMessage({ type: 'opRejected', payload: { playerId: 'me', reason: 'nothing-to-undo' } });
    expect(oc.snapshot().board).toEqual(before);
  });

  it('9. 笔记模式：切换后 inputDigit 发 note op；undo/redo/erase 发对应 op', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws);
    oc.selectCell(empties[0]);
    oc.inputDigit(7);
    oc.toggleNoteMode();
    oc.inputDigit(7);
    oc.erase();
    oc.undo();
    oc.redo();
    const ops = ws.sent.filter((m) => m.type === 'op').map((m) => (m.type === 'op' ? m.payload.op : null));
    expect(ops[0]).toEqual({ kind: 'fill', index: empties[0], value: 7 });
    expect(ops[1]).toEqual({ kind: 'note', index: empties[0], value: 7 });
    expect(ops[2]).toEqual({ kind: 'erase', index: empties[0] });
    expect(ops[3]).toEqual({ kind: 'undo' });
    expect(ops[4]).toEqual({ kind: 'redo' });
  });

  it('10. 错误计数镜像：自己 wrong +1，undo 自己的 wrong -1', () => {
    const { oc, ws } = makeController();
    joinController(oc, ws);
    const target = empties[0];
    const wrong = wrongValue(target);
    ws.emitMessage(fillApplied('me', target, wrong, 'wrong'));
    expect(oc.getMyMistakes()).toBe(1);
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        playerId: 'me',
        op: { kind: 'undo' },
        result: 'undone',
        cellIndex: target,
        cell: { value: 0, given: false, owner: null, wrong: false, notes: [] },
        clearedNotes: [],
        completedUnits: [],
      },
    });
    expect(oc.getMyMistakes()).toBe(0);
  });

  it('11. 联动清笔记镜像：correct opApplied 的 clearedNotes 格笔记被移除', () => {
    const { oc, ws } = makeController();
    const snap = makeSnapshot();
    const target = empties[0];
    const peer = empties[1];
    snap.cells[peer] = { value: 0, given: false, owner: null, wrong: false, notes: [SOLUTION[target], 2] };
    ws.emitMessage({ type: 'joined', payload: snap });
    ws.emitMessage({
      type: 'opApplied',
      payload: {
        ...fillApplied('op', target, SOLUTION[target], 'correct').payload,
        clearedNotes: [peer, target],
      },
    });
    expect(oc.snapshot().notes[peer]).toEqual([2]);
  });
});
