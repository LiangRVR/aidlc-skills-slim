import { describe, expect, it } from 'vitest';
import { ConnectionManager } from '../server/connection-manager';
import { MessageRouter } from '../server/message-router';
import { RoomManager } from '../server/room-manager';
import type { ServerMessage } from '../shared/protocol';
import {
  emptyIndices,
  makeRoom,
  makeSendRecorder,
  opsOf,
  SOLUTION,
  wrongValue,
  type SendRecorder,
} from './server-generators';

const empties = emptyIndices();

const lastApplied = (recorder: SendRecorder, id: string): ServerMessage => {
  const a = opsOf(recorder.messagesFor(id), 'opApplied');
  return a[a.length - 1];
};

describe('GameRoom v2 example-based scenarios', () => {
  it('1. 单人完局：按 solution 填满 → 全 correct、gameOver(completed, winner=自己)、status=won', () => {
    const { room, recorder } = makeRoom(['A']);
    for (const i of empties) {
      room.handleOp('A', { kind: 'fill', index: i, value: SOLUTION[i] });
    }
    const applied = opsOf(recorder.messagesFor('A'), 'opApplied');
    expect(applied).toHaveLength(empties.length);
    for (const m of applied) {
      expect(m.type === 'opApplied' && m.payload.result).toBe('correct');
    }
    const over = opsOf(recorder.messagesFor('A'), 'gameOver');
    expect(over).toHaveLength(1);
    if (over[0].type !== 'gameOver') return;
    expect(over[0].payload.reason).toBe('completed');
    expect(over[0].payload.winnerId).toBe('A');
    expect(over[0].payload.scores['A']).toBeGreaterThan(0);
    expect(over[0].payload.elapsedSeconds).toBeGreaterThanOrEqual(0);
    expect(room.getStatus()).toBe('won');
  });

  it('2. 双人竞速：交错填对，双方互收公共 opApplied；scores 随填入更新；分高者胜', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    empties.forEach((i, k) => {
      room.handleOp(k % 2 === 0 ? 'A' : 'B', { kind: 'fill', index: i, value: SOLUTION[i] });
    });
    const aMsgs = recorder.messagesFor('A');
    const bMsgs = recorder.messagesFor('B');
    expect(opsOf(aMsgs, 'opApplied').some((m) => m.type === 'opApplied' && m.payload.playerId === 'B')).toBe(true);
    expect(opsOf(bMsgs, 'opApplied').some((m) => m.type === 'opApplied' && m.payload.playerId === 'A')).toBe(true);
    const aOver = opsOf(aMsgs, 'gameOver');
    const bOver = opsOf(bMsgs, 'gameOver');
    expect(aOver).toHaveLength(1);
    expect(bOver).toHaveLength(1);
    if (aOver[0].type !== 'gameOver' || bOver[0].type !== 'gameOver') return;
    expect(aOver[0].payload.reason).toBe('completed');
    expect(bOver[0].payload).toEqual(aOver[0].payload);
    expect(aOver[0].payload.scores['A']).toBe(3080);
    expect(aOver[0].payload.scores['B']).toBe(2960);
    expect(aOver[0].payload.winnerId).toBe('A');
    for (const m of [...opsOf(aMsgs, 'opApplied'), ...opsOf(bMsgs, 'opApplied')]) {
      if (m.type !== 'opApplied') continue;
      for (const s of Object.values(m.payload.scores)) {
        expect(s).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('3. 平分判和：双方同分 → gameOver.winnerId=null', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    for (let k = 0; k < 25; k++) {
      room.handleOp('A', { kind: 'fill', index: empties[k], value: SOLUTION[empties[k]] });
    }
    room.handleOp('B', { kind: 'fill', index: empties[25], value: SOLUTION[empties[25]] });
    room.handleOp('B', { kind: 'fill', index: empties[26], value: wrongValue(empties[26]) });
    for (let k = 27; k < 51; k++) {
      room.handleOp('B', { kind: 'fill', index: empties[k], value: SOLUTION[empties[k]] });
    }
    room.handleOp('B', { kind: 'fill', index: empties[26], value: SOLUTION[empties[26]] });
    const over = opsOf(recorder.messagesFor('A'), 'gameOver');
    expect(over).toHaveLength(1);
    if (over[0].type !== 'gameOver') return;
    expect(over[0].payload.reason).toBe('completed');
    expect(over[0].payload.winnerId).toBeNull();
    expect(over[0].payload.scores['A']).toBe(over[0].payload.scores['B']);
  });

  it('4. 连击不被打断：A 连对 2 次、B 填对、A 第 3 对 → delta=120（score=320）', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    room.handleOp('A', { kind: 'fill', index: empties[1], value: SOLUTION[empties[1]] });
    room.handleOp('B', { kind: 'fill', index: empties[2], value: SOLUTION[empties[2]] });
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: empties[3], value: SOLUTION[empties[3]] });
    const applied = lastApplied(recorder, 'A');
    expect(applied.type === 'opApplied' && applied.payload.result).toBe('correct');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.scores['A']).toBe(320);
    expect(applied.payload.scores['B']).toBe(100);
  });

  it('5. 扣分下限：score=100 填错 → 0；score=0 再填错 → 仍 0', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: empties[1], value: wrongValue(empties[1]) });
    let applied = lastApplied(recorder, 'A');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.result).toBe('wrong');
    expect(applied.payload.scores['A']).toBe(0);
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: empties[2], value: wrongValue(empties[2]) });
    applied = lastApplied(recorder, 'A');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.scores['A']).toBe(0);
  });

  it('6. 错填覆盖转移：B fill 覆盖 A 的 wrong 格 → result=correct、owner=B、B 得分', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'fill', index: target, value: wrongValue(target) });
    recorder.clear();
    room.handleOp('B', { kind: 'fill', index: target, value: SOLUTION[target] });
    const applied = lastApplied(recorder, 'B');
    expect(applied.type === 'opApplied' && applied.payload.result).toBe('correct');
    if (applied.type !== 'opApplied' || applied.payload.result !== 'correct') return;
    expect(applied.payload.cell.owner).toBe('B');
    expect(applied.payload.scores['B']).toBe(100);
    expect(room.getCells()[target]).toMatchObject({ value: SOLUTION[target], owner: 'B', wrong: false });
  });

  it('7. 擦对方格（正确/错填）→ not-erasable，棋盘不变', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'fill', index: target, value: SOLUTION[target] });
    room.handleOp('A', { kind: 'fill', index: empties[1], value: wrongValue(empties[1]) });
    const cellsBefore = room.getCells();
    recorder.clear();
    room.handleOp('B', { kind: 'erase', index: target });
    room.handleOp('B', { kind: 'erase', index: empties[1] });
    const bMsgs = recorder.messagesFor('B');
    expect(bMsgs).toHaveLength(2);
    for (const m of bMsgs) {
      expect(m.type === 'opRejected' && m.payload.reason).toBe('not-erasable');
    }
    expect(room.getCells()).toEqual(cellsBefore);
  });

  it('8. 覆盖对方正确格 → not-overwritable', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'fill', index: target, value: SOLUTION[target] });
    recorder.clear();
    room.handleOp('B', { kind: 'fill', index: target, value: wrongValue(target) });
    const bMsgs = recorder.messagesFor('B');
    expect(bMsgs).toHaveLength(1);
    expect(bMsgs[0].type === 'opRejected' && bMsgs[0].payload.reason).toBe('not-overwritable');
    expect(room.getCells()[target]).toMatchObject({ value: SOLUTION[target], owner: 'A', wrong: false });
  });

  it('9. 笔记私有：A note 仅 A 收到；B 收 0 条；B 的 snapshotFor 无该笔记', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    recorder.clear();
    room.handleOp('A', { kind: 'note', index: target, value: 5 });
    const aMsgs = recorder.messagesFor('A');
    const bMsgs = recorder.messagesFor('B');
    expect(aMsgs).toHaveLength(1);
    expect(aMsgs[0].type === 'opApplied' && aMsgs[0].payload.result).toBe('note');
    if (aMsgs[0].type === 'opApplied' && aMsgs[0].payload.result === 'note') expect(aMsgs[0].payload.notes).toEqual([5]);
    expect(bMsgs).toHaveLength(0);
    expect(room.snapshotFor('B').yourNotes[target]).toBeUndefined();
    expect(room.snapshotFor('A').yourNotes[target]).toEqual([5]);
  });

  it('10. 笔记代清双方：A 填对后 A、B 各自副本 clearedNotes 均含同行笔记格', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    const v = SOLUTION[target];
    const row = Math.floor(target / 9);
    const peer = empties.find((i) => Math.floor(i / 9) === row && i !== target) as number;
    room.handleOp('A', { kind: 'note', index: peer, value: v });
    room.handleOp('B', { kind: 'note', index: peer, value: v });
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: target, value: v });
    const aApplied = opsOf(recorder.messagesFor('A'), 'opApplied');
    const bApplied = opsOf(recorder.messagesFor('B'), 'opApplied');
    expect(aApplied).toHaveLength(1);
    expect(bApplied).toHaveLength(1);
    if (aApplied[0].type !== 'opApplied' || bApplied[0].type !== 'opApplied') return;
    expect(aApplied[0].payload.result).toBe('correct');
    expect(aApplied[0].payload.clearedNotes).toContainEqual({ index: peer, value: v });
    expect(bApplied[0].payload.clearedNotes).toContainEqual({ index: peer, value: v });
    expect(bApplied[0].payload.playerId).toBe('A');
    expect(room.snapshotFor('A').yourNotes[peer]).toBeUndefined();
    expect(room.snapshotFor('B').yourNotes[peer]).toBeUndefined();
  });

  it('10b. 代清只移除被填数字：同格 {5,6} 笔记在填入 6 后保留 5（用户回归）', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    const v = SOLUTION[target];
    const w = v === 9 ? 1 : v + 1;
    const row = Math.floor(target / 9);
    const peer = empties.find((i) => Math.floor(i / 9) === row && i !== target) as number;
    room.handleOp('A', { kind: 'note', index: peer, value: v });
    room.handleOp('A', { kind: 'note', index: peer, value: w });
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: target, value: v });
    const aApplied = opsOf(recorder.messagesFor('A'), 'opApplied');
    expect(aApplied).toHaveLength(1);
    if (aApplied[0].type !== 'opApplied') return;
    expect(aApplied[0].payload.clearedNotes).toEqual([{ index: peer, value: v }]);
    expect(room.snapshotFor('A').yourNotes[peer]).toEqual([w]);
  });

  it('10c. note undo/redo 极性（H1 回归）：加笔记→undo 消失→redo 回来；payload 带整格 notes 且仅发起者', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'note', index: target, value: 5 });
    expect(room.snapshotFor('A').yourNotes[target]).toEqual([5]);
    recorder.clear();
    room.handleOp('A', { kind: 'undo' });
    expect(room.snapshotFor('A').yourNotes[target]).toBeUndefined();
    let aMsgs = opsOf(recorder.messagesFor('A'), 'opApplied');
    expect(aMsgs).toHaveLength(1);
    if (aMsgs[0].type !== 'opApplied') return;
    expect(aMsgs[0].payload.result).toBe('undone');
    if (aMsgs[0].payload.result === 'undone') expect(aMsgs[0].payload.notes).toEqual([]);
    expect(opsOf(recorder.messagesFor('B'), 'opApplied')).toHaveLength(1);
    const bCopy = opsOf(recorder.messagesFor('B'), 'opApplied')[0];
    if (bCopy.type === 'opApplied' && bCopy.payload.result === 'undone') {
      expect(bCopy.payload.notes).toBeUndefined();
    }
    room.handleOp('A', { kind: 'redo' });
    expect(room.snapshotFor('A').yourNotes[target]).toEqual([5]);
    aMsgs = opsOf(recorder.messagesFor('A'), 'opApplied');
    const redoMsg = aMsgs[aMsgs.length - 1];
    if (redoMsg.type === 'opApplied' && redoMsg.payload.result === 'redone') {
      expect(redoMsg.payload.notes).toEqual([5]);
    }
  });

  it('10d. 删笔记→undo 恢复（H1 反向回归）', () => {
    const { room } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'note', index: target, value: 5 });
    room.handleOp('A', { kind: 'note', index: target, value: 5 });
    expect(room.snapshotFor('A').yourNotes[target]).toBeUndefined();
    room.handleOp('A', { kind: 'undo' });
    expect(room.snapshotFor('A').yourNotes[target]).toEqual([5]);
  });

  it('12b. fill undo 恢复该格自身笔记（M1 回归）：fill 清掉的 ownNotes 在 undo 后回来、redo 再清', () => {
    const { room } = makeRoom(['A', 'B']);
    const target = empties[0];
    const v = SOLUTION[target];
    const w = v === 9 ? 1 : v + 1;
    room.handleOp('A', { kind: 'note', index: target, value: v });
    room.handleOp('A', { kind: 'note', index: target, value: w });
    room.handleOp('A', { kind: 'fill', index: target, value: v });
    expect(room.snapshotFor('A').yourNotes[target]).toBeUndefined();
    room.handleOp('A', { kind: 'undo' });
    expect(room.snapshotFor('A').yourNotes[target]).toEqual([v, w]);
    room.handleOp('A', { kind: 'redo' });
    expect(room.snapshotFor('A').yourNotes[target]).toBeUndefined();
  });

  it('15. 过期 undo 拒绝（L1 回归）：A 填错→B 覆盖→A undo → opRejected(stale-undo)、无 opApplied、棋盘不变', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'fill', index: target, value: wrongValue(target) });
    room.handleOp('B', { kind: 'fill', index: target, value: SOLUTION[target] });
    recorder.clear();
    room.handleOp('A', { kind: 'undo' });
    expect(opsOf(recorder.messagesFor('A'), 'opApplied')).toHaveLength(0);
    expect(opsOf(recorder.messagesFor('B'), 'opApplied')).toHaveLength(0);
    const rejected = opsOf(recorder.messagesFor('A'), 'opRejected');
    expect(rejected).toHaveLength(1);
    if (rejected[0].type === 'opRejected') expect(rejected[0].payload.reason).toBe('stale-undo');
    expect(room.getCells()[target]).toMatchObject({ value: SOLUTION[target], owner: 'B', wrong: false });
  });

  it('16. erase 计分房间级（盲区补齐）：擦自己正确格 -100（下限 0）；擦自己错填格不扣', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const t1 = empties[0];
    room.handleOp('A', { kind: 'fill', index: t1, value: SOLUTION[t1] });
    let applied = lastApplied(recorder, 'A');
    if (applied.type === 'opApplied') expect(applied.payload.scores['A']).toBe(100);
    room.handleOp('A', { kind: 'erase', index: t1 });
    applied = lastApplied(recorder, 'A');
    if (applied.type === 'opApplied') {
      expect(applied.payload.result).toBe('erased');
      expect(applied.payload.scores['A']).toBe(0);
    }
    const t2 = empties[1];
    room.handleOp('B', { kind: 'fill', index: t2, value: wrongValue(t2) });
    applied = lastApplied(recorder, 'B');
    if (applied.type === 'opApplied') expect(applied.payload.scores['B']).toBe(0);
    room.handleOp('B', { kind: 'erase', index: t2 });
    applied = lastApplied(recorder, 'B');
    if (applied.type === 'opApplied') {
      expect(applied.payload.result).toBe('erased');
      expect(applied.payload.scores['B']).toBe(0);
    }
  });

  it('11. undo 错填不返还：score 不变、格子恢复为空', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    room.handleOp('A', { kind: 'fill', index: empties[1], value: SOLUTION[empties[1]] });
    room.handleOp('A', { kind: 'fill', index: empties[2], value: wrongValue(empties[2]) });
    recorder.clear();
    room.handleOp('A', { kind: 'undo' });
    const applied = lastApplied(recorder, 'A');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.result).toBe('undone');
    expect(applied.payload.scores['A']).toBe(100);
    expect(room.getCells()[empties[2]]).toMatchObject({ value: 0, owner: null, wrong: false });
  });

  it('12. undo 正确返还 + redo 恢复', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    recorder.clear();
    room.handleOp('A', { kind: 'undo' });
    let applied = lastApplied(recorder, 'A');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.result).toBe('undone');
    expect(applied.payload.scores['A']).toBe(0);
    expect(room.getCells()[empties[0]]).toMatchObject({ value: 0, owner: null });
    recorder.clear();
    room.handleOp('A', { kind: 'redo' });
    applied = lastApplied(recorder, 'A');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.result).toBe('redone');
    expect(applied.payload.scores['A']).toBe(100);
    expect(room.getCells()[empties[0]]).toMatchObject({ value: SOLUTION[empties[0]], owner: 'A', wrong: false });
  });

  it('13. 离开判胜：双人 playing B leave → A 收 gameOver(forfeit, winner=A)，无 playerLeft', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    recorder.clear();
    room.removePlayer('B');
    const aMsgs = recorder.messagesFor('A');
    const over = opsOf(aMsgs, 'gameOver');
    expect(over).toHaveLength(1);
    if (over[0].type !== 'gameOver') return;
    expect(over[0].payload.reason).toBe('forfeit');
    expect(over[0].payload.winnerId).toBe('A');
    expect(recorder.log.some((r) => r.msg.type === 'playerLeft')).toBe(false);
    expect(room.getStatus()).toBe('won');
    expect(room.getPlayerCount()).toBe(1);
  });

  it('14. won 后一切 op → opRejected(game-over)', () => {
    const { room, recorder } = makeRoom(['A']);
    for (const i of empties) {
      room.handleOp('A', { kind: 'fill', index: i, value: SOLUTION[i] });
    }
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    room.handleOp('A', { kind: 'erase', index: empties[0] });
    room.handleOp('A', { kind: 'note', index: empties[0], value: 1 });
    room.handleOp('A', { kind: 'undo' });
    room.handleOp('A', { kind: 'redo' });
    const msgs = recorder.messagesFor('A');
    expect(msgs).toHaveLength(5);
    for (const m of msgs) {
      expect(m.type === 'opRejected' && m.payload.reason).toBe('game-over');
    }
  });

  it('15. 单人房离开回收：唯一玩家 leave → 房间销毁、不可再匹配', () => {
    const recorder = makeSendRecorder();
    const manager = new RoomManager(recorder.send);
    const room = manager.createRoom('easy', 'room-x');
    room.addPlayer('A');
    expect(manager.matchRoom('easy')?.getRoomId()).toBe('room-x');
    room.removePlayer('A');
    manager.reclaimIfEmpty('room-x');
    expect(manager.getRoom('room-x')).toBeUndefined();
    expect(manager.matchRoom('easy')).toBeNull();
    expect(manager.listRooms()).toHaveLength(0);
  }, 15000);

  it('16. undo/redo 空栈 → 拒绝', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'undo' });
    room.handleOp('A', { kind: 'redo' });
    const msgs = recorder.messagesFor('A');
    expect(msgs[0].type === 'opRejected' && msgs[0].payload.reason).toBe('nothing-to-undo');
    expect(msgs[1].type === 'opRejected' && msgs[1].payload.reason).toBe('nothing-to-redo');
  });

  it('17. fill 预填格 → given-cell', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'fill', index: 0, value: 5 });
    const msgs = recorder.messagesFor('A');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type === 'opRejected' && msgs[0].payload.reason).toBe('given-cell');
  });

  it('18. 非法帧 → error 回复，连接保持', () => {
    const sent: ServerMessage[] = [];
    const roomSend = makeSendRecorder();
    const manager = new RoomManager(roomSend.send);
    const connections = new ConnectionManager();
    connections.register('p1', (msg) => sent.push(msg));
    const router = new MessageRouter(manager, connections);
    router.handleRaw('p1', 'not json at all');
    router.handleRaw('p1', JSON.stringify({ version: 99, type: 'join', payload: { difficulty: 'easy' } }));
    expect(sent).toHaveLength(2);
    for (const m of sent) {
      expect(m.type === 'error' && m.payload.message).toBe('消息格式非法或版本不兼容');
    }
    expect(connections.isConnected('p1')).toBe(true);
  });
});
