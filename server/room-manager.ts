import type { Difficulty } from '../src/core/types';
import { SudokuGenerator } from '../src/core/sudoku-generator';
import { randomUUID } from 'node:crypto';
import type { RoomId } from '../shared/protocol';
import { GameRoom, type RoomSender } from './game-room';

export interface JoinableRoomInfo {
  roomId: RoomId;
  difficulty: Difficulty;
  status: 'playing' | 'won';
  playerCount: number;
  startedAt: number;
}

const TIERS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export function selectRoom(rooms: JoinableRoomInfo[], difficulty: Difficulty): JoinableRoomInfo | null {
  const joinable = rooms.filter((r) => r.status === 'playing' && r.playerCount === 1);
  if (joinable.length === 0) return null;
  const same = joinable.filter((r) => r.difficulty === difficulty);
  if (same.length > 0) {
    return same.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
  }
  const requestTier = TIERS.indexOf(difficulty);
  let best: JoinableRoomInfo = joinable[0];
  let bestDist = Math.abs(TIERS.indexOf(best.difficulty) - requestTier);
  let bestTier = TIERS.indexOf(best.difficulty);
  for (let i = 1; i < joinable.length; i++) {
    const r = joinable[i];
    const tier = TIERS.indexOf(r.difficulty);
    const dist = Math.abs(tier - requestTier);
    if (dist < bestDist || (dist === bestDist && tier > bestTier)) {
      best = r;
      bestDist = dist;
      bestTier = tier;
    } else if (dist === bestDist && tier === bestTier && r.startedAt < best.startedAt) {
      best = r;
    }
  }
  return best;
}

export class RoomManager {
  private readonly send: RoomSender;
  private readonly rooms = new Map<RoomId, GameRoom>();

  constructor(send: RoomSender) {
    this.send = send;
  }

  createRoom(difficulty: Difficulty, roomId?: RoomId): GameRoom {
    const id = roomId ?? randomUUID();
    const room = new GameRoom(SudokuGenerator.generate(difficulty), difficulty, id, Date.now(), this.send);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(roomId: RoomId): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  matchRoom(difficulty: Difficulty): GameRoom | null {
    const info = selectRoom(this.listRooms(), difficulty);
    if (!info) return null;
    return this.rooms.get(info.roomId) ?? null;
  }

  reclaimIfEmpty(roomId: RoomId): void {
    const room = this.rooms.get(roomId);
    if (room && room.getPlayerCount() === 0) {
      this.rooms.delete(roomId);
    }
  }

  listRooms(): JoinableRoomInfo[] {
    return Array.from(this.rooms.values()).map((room) => ({
      roomId: room.getRoomId(),
      difficulty: room.getDifficulty(),
      status: room.getStatus(),
      playerCount: room.getPlayerCount(),
      startedAt: room.getStartedAt(),
    }));
  }
}
