import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../src/core/types';
import { selectRoom, type JoinableRoomInfo } from '../server/room-manager';
import { arbDifficulty, arbRoomPool } from './server-generators';

const TIERS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const isJoinable = (r: JoinableRoomInfo): boolean => r.status === 'playing' && r.playerCount === 1;

function refSelect(pool: JoinableRoomInfo[], d: Difficulty): JoinableRoomInfo | null {
  const joinable = pool.filter(isJoinable);
  if (joinable.length === 0) return null;
  const same = joinable.filter((r) => r.difficulty === d);
  if (same.length > 0) {
    return same.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
  }
  const req = TIERS.indexOf(d);
  const rank = (r: JoinableRoomInfo): { dist: number; harder: number } => {
    const tier = TIERS.indexOf(r.difficulty);
    return { dist: Math.abs(tier - req), harder: tier };
  };
  const bestKey = joinable.reduce((best, r) => {
    const k = rank(r);
    return k.dist < best.dist || (k.dist === best.dist && k.harder > best.harder) ? k : best;
  }, rank(joinable[0]));
  const candidates = joinable.filter((r) => {
    const k = rank(r);
    return k.dist === bestKey.dist && k.harder === bestKey.harder;
  });
  return candidates.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
}

describe('SP-1 匹配算法不变量（Oracle）', () => {
  it('selectRoom 与参考实现一致，且满足可加入谓词不变量', () => {
    fc.assert(
      fc.property(arbRoomPool, arbDifficulty, (pool, d) => {
        const got = selectRoom(pool, d);
        const expected = refSelect(pool, d);
        expect(got?.roomId ?? null).toBe(expected?.roomId ?? null);
        const anyJoinable = pool.some(isJoinable);
        if (!anyJoinable) {
          expect(got).toBeNull();
        } else {
          expect(got).not.toBeNull();
          expect(got && isJoinable(got)).toBe(true);
        }
        const sameJoinable = pool.filter((r) => isJoinable(r) && r.difficulty === d);
        if (sameJoinable.length > 0) {
          expect(got?.difficulty).toBe(d);
          for (const r of sameJoinable) {
            expect(got && r.startedAt >= got.startedAt).toBe(true);
          }
        }
      })
    );
  });
});

describe('SP-5 断线补位与回收（谓词层 PBT）', () => {
  it('playerCount 2→1 的 playing 房同难度请求必命中；playerCount 0 永不命中', () => {
    fc.assert(
      fc.property(arbRoomPool, (pool) => {
        for (const room of pool) {
          if (room.status !== 'playing') continue;
          const afterLeave = { ...room, playerCount: 1 };
          const hit = selectRoom([afterLeave], room.difficulty);
          expect(hit?.roomId).toBe(room.roomId);
          const empty = { ...room, playerCount: 0 };
          expect(selectRoom([empty], room.difficulty)).toBeNull();
        }
      })
    );
  });

  it('won 房间不可加入（任何难度请求均不命中）', () => {
    fc.assert(
      fc.property(arbRoomPool, arbDifficulty, (pool, d) => {
        const wonOnly = pool.map((r) => ({ ...r, status: 'won' as const }));
        expect(selectRoom(wonOnly, d)).toBeNull();
      })
    );
  });
});
