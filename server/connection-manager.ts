import type { PlayerId, RoomId, ServerMessage } from '../shared/protocol';

export type ConnectionSend = (msg: ServerMessage) => void;

interface Connection {
  send: ConnectionSend;
  roomId: RoomId | null;
}

export class ConnectionManager {
  private readonly connections = new Map<PlayerId, Connection>();

  register(playerId: PlayerId, send: ConnectionSend): void {
    this.connections.set(playerId, { send, roomId: null });
  }

  unregister(playerId: PlayerId): void {
    this.connections.delete(playerId);
  }

  sendTo(playerId: PlayerId, msg: ServerMessage): void {
    const connection = this.connections.get(playerId);
    if (connection) connection.send(msg);
  }

  setRoom(playerId: PlayerId, roomId: RoomId | null): void {
    const connection = this.connections.get(playerId);
    if (connection) connection.roomId = roomId;
  }

  getRoom(playerId: PlayerId): RoomId | null {
    return this.connections.get(playerId)?.roomId ?? null;
  }

  isConnected(playerId: PlayerId): boolean {
    return this.connections.has(playerId);
  }
}
