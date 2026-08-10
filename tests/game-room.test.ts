import { describe, expect, it } from 'vitest';
import { ConnectionManager } from '../server/connection-manager';
import { MessageRouter } from '../server/message-router';
import { RoomManager } from '../server/room-manager';
import type { ServerMessage } from '../shared/protocol';
import { emptyIndices, makeRoom, makeSendRecorder, SOLUTION, wrongValue } from './server-generators';

const empties = emptyIndices();

const opsOf = (msgs: ServerMessage[], type: string) => msgs.filter((m) => m.type === type);

describe('GameRoom example-based scenarios', () => {
  it('1. 单人完整对局：按 solution 填满 → 全 correct，末步后 gameWon，status=won', () => {
    const { room, recorder } = makeRoom(['A']);
    for (const i of empties) {
      room.handleOp('A', { kind: 'fill', index: i, value: SOLUTION[i] });
    }
    const applied = opsOf(recorder.messagesFor('A'), 'opApplied');
    expect(applied).toHaveLength(empties.length);
    for (const m of applied) {
      expect(m.type === 'opApplied' && m.payload.result).toBe('correct');
    }
    const won = opsOf(recorder.messagesFor('A'), 'gameWon');
    expect(won).toHaveLength(1);
    expect(won[0].type === 'gameWon' && won[0].payload.elapsedSeconds).toBeGreaterThanOrEqual(0);
    expect(room.getStatus()).toBe('won');
  });

  it('2. 双人协作：双方互收 opApplied；gameWon 每人恰好一条', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    empties.forEach((i, k) => {
      room.handleOp(k % 2 === 0 ? 'A' : 'B', { kind: 'fill', index: i, value: SOLUTION[i] });
    });
    const aMsgs = recorder.messagesFor('A');
    const bMsgs = recorder.messagesFor('B');
    expect(opsOf(aMsgs, 'opApplied').some((m) => m.type === 'opApplied' && m.payload.playerId === 'B')).toBe(true);
    expect(opsOf(bMsgs, 'opApplied').some((m) => m.type === 'opApplied' && m.payload.playerId === 'A')).toBe(true);
    expect(opsOf(aMsgs, 'gameWon')).toHaveLength(1);
    expect(opsOf(bMsgs, 'gameWon')).toHaveLength(1);
  });

  it('3. 3 错旁观：A 错满转旁观，后续 op 拒 spectating 且无副作用；B 可完成获胜', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    for (let k = 0; k < 3; k++) {
      room.handleOp('A', { kind: 'fill', index: empties[k], value: wrongValue(empties[k]) });
    }
    expect(opsOf(recorder.messagesFor('A'), 'playerLost')).toHaveLength(1);
    expect(opsOf(recorder.messagesFor('B'), 'playerLost')).toHaveLength(1);
    const cellsBefore = room.getCells();
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: empties[3], value: SOLUTION[empties[3]] });
    const aMsgs = recorder.messagesFor('A');
    expect(opsOf(aMsgs, 'opRejected')).toHaveLength(1);
    expect(aMsgs[0].type === 'opRejected' && aMsgs[0].payload.reason).toBe('spectating');
    expect(room.getCells()).toEqual(cellsBefore);
    recorder.clear();
    for (const i of empties) {
      room.handleOp('B', { kind: 'fill', index: i, value: SOLUTION[i] });
    }
    expect(opsOf(recorder.messagesFor('B'), 'gameWon')).toHaveLength(1);
  });

  it('4. 错填互擦：B 擦除 A 的错填格', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'fill', index: target, value: wrongValue(target) });
    room.handleOp('B', { kind: 'erase', index: target });
    const bMsgs = opsOf(recorder.messagesFor('B'), 'opApplied');
    const last = bMsgs[bMsgs.length - 1];
    expect(last.type === 'opApplied' && last.payload.result).toBe('erased');
    const cell = room.getCells()[target];
    expect(cell).toMatchObject({ value: 0, owner: null, wrong: false });
  });

  it('5. 擦对方正确格 → not-erasable，棋盘不变', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    room.handleOp('A', { kind: 'fill', index: target, value: SOLUTION[target] });
    const cellsBefore = room.getCells();
    recorder.clear();
    room.handleOp('B', { kind: 'erase', index: target });
    const bMsgs = recorder.messagesFor('B');
    expect(bMsgs).toHaveLength(1);
    expect(bMsgs[0].type === 'opRejected' && bMsgs[0].payload.reason).toBe('not-erasable');
    expect(room.getCells()).toEqual(cellsBefore);
  });

  it('6. 补位：B 离开后 C 加入，继承棋盘（含 B 的格子），C 计数清零', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    room.handleOp('B', { kind: 'fill', index: empties[1], value: SOLUTION[empties[1]] });
    room.handleOp('B', { kind: 'fill', index: empties[2], value: wrongValue(empties[2]) });
    room.removePlayer('B');
    recorder.clear();
    room.addPlayer('C');
    const cMsgs = recorder.messagesFor('C');
    expect(cMsgs).toHaveLength(1);
    expect(cMsgs[0].type).toBe('joined');
    if (cMsgs[0].type !== 'joined') return;
    const snap = cMsgs[0].payload;
    expect(snap.you).toBe('C');
    expect(snap.cells[empties[0]].owner).toBe('A');
    expect(snap.cells[empties[1]].owner).toBe('B');
    expect(snap.cells[empties[2]].wrong).toBe(true);
    const cInfo = snap.players.find((p) => p.id === 'C');
    expect(cInfo).toMatchObject({ mistakes: 0, spectating: false });
    expect(snap.players.find((p) => p.id === 'B')).toBeUndefined();
  });

  it('7. 空房回收：唯一玩家离开后 reclaimIfEmpty，房间不再可匹配', () => {
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

  it('8. won 后一切 op → game-over', () => {
    const { room, recorder } = makeRoom(['A']);
    for (const i of empties) {
      room.handleOp('A', { kind: 'fill', index: i, value: SOLUTION[i] });
    }
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: empties[0], value: SOLUTION[empties[0]] });
    room.handleOp('A', { kind: 'erase', index: empties[0] });
    room.handleOp('A', { kind: 'note', index: empties[0], value: 1 });
    room.handleOp('A', { kind: 'undo' });
    const msgs = recorder.messagesFor('A');
    expect(msgs).toHaveLength(4);
    for (const m of msgs) {
      expect(m.type === 'opRejected' && m.payload.reason).toBe('game-over');
    }
  });

  it('9. 非法帧 → error 回复，连接保持', () => {
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

  it('10. undo/redo 空栈 → 拒绝', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'undo' });
    room.handleOp('A', { kind: 'redo' });
    const msgs = recorder.messagesFor('A');
    expect(msgs[0].type === 'opRejected' && msgs[0].payload.reason).toBe('nothing-to-undo');
    expect(msgs[1].type === 'opRejected' && msgs[1].payload.reason).toBe('nothing-to-redo');
  });

  it('11. fill 预填格 → given-cell', () => {
    const { room, recorder } = makeRoom(['A']);
    room.handleOp('A', { kind: 'fill', index: 0, value: 5 });
    const msgs = recorder.messagesFor('A');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type === 'opRejected' && msgs[0].payload.reason).toBe('given-cell');
  });

  it('12. 笔记联动清除（双人）：A 填对后 B 的同单元笔记被清除并广播', () => {
    const { room, recorder } = makeRoom(['A', 'B']);
    const target = empties[0];
    const row = Math.floor(target / 9);
    const peer = empties.find((i) => Math.floor(i / 9) === row && i !== target) as number;
    const v = SOLUTION[target];
    room.handleOp('B', { kind: 'note', index: peer, value: v });
    recorder.clear();
    room.handleOp('A', { kind: 'fill', index: target, value: v });
    const aMsgs = opsOf(recorder.messagesFor('A'), 'opApplied');
    expect(aMsgs).toHaveLength(1);
    const applied = aMsgs[0];
    expect(applied.type === 'opApplied' && applied.payload.result).toBe('correct');
    if (applied.type !== 'opApplied') return;
    expect(applied.payload.clearedNotes).toContain(peer);
    expect(room.getCells()[peer].notes).not.toContain(v);
    const bMsgs = opsOf(recorder.messagesFor('B'), 'opApplied');
    expect(bMsgs).toHaveLength(1);
  });
});
