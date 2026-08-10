import { deserialize, type ClientMessage, type PlayerId } from '../shared/protocol';
import type { RoomManager } from './room-manager';
import type { ConnectionManager } from './connection-manager';

export class MessageRouter {
  constructor(
    private readonly roomManager: RoomManager,
    private readonly connections: ConnectionManager,
  ) {}

  handleRaw(playerId: PlayerId, raw: string): void {
    const msg = deserialize(raw);
    if (!msg) {
      this.sendError(playerId, '消息格式非法或版本不兼容');
      return;
    }
    switch (msg.type) {
      case 'join':
        this.handleJoin(playerId, msg);
        break;
      case 'op':
        this.handleOp(playerId, msg);
        break;
      case 'leave':
        this.handleLeave(playerId);
        break;
    }
  }

  handleDisconnect(playerId: PlayerId): void {
    this.handleLeave(playerId);
  }

  private handleJoin(playerId: PlayerId, msg: Extract<ClientMessage, { type: 'join' }>): void {
    if (this.connections.getRoom(playerId) !== null) {
      this.sendError(playerId, 'already-joined');
      return;
    }
    const room = this.roomManager.matchRoom(msg.payload.difficulty) ?? this.roomManager.createRoom(msg.payload.difficulty);
    room.addPlayer(playerId);
    this.connections.setRoom(playerId, room.getRoomId());
  }

  private handleOp(playerId: PlayerId, msg: Extract<ClientMessage, { type: 'op' }>): void {
    const roomId = this.connections.getRoom(playerId);
    if (roomId === null) {
      this.sendError(playerId, 'not-in-room');
      return;
    }
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      this.connections.setRoom(playerId, null);
      return;
    }
    room.handleOp(playerId, msg.payload.op);
  }

  private handleLeave(playerId: PlayerId): void {
    const roomId = this.connections.getRoom(playerId);
    if (roomId === null) return;
    const room = this.roomManager.getRoom(roomId);
    this.connections.setRoom(playerId, null);
    if (room) {
      room.removePlayer(playerId);
      this.roomManager.reclaimIfEmpty(roomId);
    }
  }

  private sendError(playerId: PlayerId, message: string): void {
    this.connections.sendTo(playerId, { type: 'error', payload: { message } });
  }
}
