import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyErase,
  applyFillCorrect,
  applyFillWrong,
  applyRedoFill,
  applyUndoFill,
  type ScoreState,
} from '../server/score-engine';

const arbState: fc.Arbitrary<ScoreState> = fc.record({
  score: fc.integer({ min: 0, max: 10000 }),
  combo: fc.integer({ min: 0, max: 50 }),
});
const arbRecordedDelta = fc.integer({ min: -10000, max: 10000 });

describe('SP-6 ScoreEngine 计分属性', () => {
  it('任意操作后 score>=0 且 score=0 时 wrong/erase(correct) 的 delta=0', () => {
    fc.assert(
      fc.property(arbState, arbRecordedDelta, (s, d) => {
        for (const r of [
          applyFillCorrect(s),
          applyFillWrong(s),
          applyUndoFill(s, d),
          applyRedoFill(s, d),
          applyErase(s, true),
          applyErase(s, false),
        ]) {
          expect(r.next.score).toBeGreaterThanOrEqual(0);
          expect(r.next.combo).toBeGreaterThanOrEqual(0);
        }
        if (s.score === 0) {
          expect(applyFillWrong(s).delta).toBe(0);
          expect(applyErase(s, true).delta).toBe(0);
        }
      })
    );
  });

  it('applyFillCorrect：combo+1、delta=100+(combo+1>=3?20:0)、score=score+delta', () => {
    fc.assert(
      fc.property(arbState, (s) => {
        const { next, delta } = applyFillCorrect(s);
        expect(next.combo).toBe(s.combo + 1);
        expect(delta).toBe(100 + (next.combo >= 3 ? 20 : 0));
        expect(next.score).toBe(s.score + delta);
      })
    );
  });

  it('wrong/erase/undo/redo 后 combo=0', () => {
    fc.assert(
      fc.property(arbState, arbRecordedDelta, (s, d) => {
        expect(applyFillWrong(s).next.combo).toBe(0);
        expect(applyErase(s, true).next.combo).toBe(0);
        expect(applyErase(s, false).next.combo).toBe(0);
        expect(applyUndoFill(s, d).next.combo).toBe(0);
        expect(applyRedoFill(s, d).next.combo).toBe(0);
      })
    );
  });

  it('undo/redo 对称：d>0 差仅为下限截断差额；d<=0 两者 delta 均为 0', () => {
    fc.assert(
      fc.property(arbState, arbRecordedDelta, (s, d) => {
        if (d > 0) {
          const undone = applyUndoFill(s, d);
          expect(undone.delta).toBe(0 - Math.min(d, s.score));
          const redone = applyRedoFill(undone.next, d);
          expect(redone.delta).toBe(d);
          expect(redone.next.score).toBe(s.score - Math.min(d, s.score) + d);
        } else {
          expect(applyUndoFill(s, d).delta).toBe(0);
          expect(applyRedoFill(s, d).delta).toBe(0);
        }
      })
    );
  });
});

describe('ScoreEngine example-based', () => {
  it('连击：第 3 次连续填对起 delta=120（不递增）', () => {
    let s: ScoreState = { score: 0, combo: 0 };
    const deltas: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = applyFillCorrect(s);
      deltas.push(r.delta);
      s = r.next;
    }
    expect(deltas).toEqual([100, 100, 120, 120, 120]);
    expect(s.score).toBe(560);
  });

  it('下限截断：score=50 填错 → delta=-50、score=0', () => {
    const r = applyFillWrong({ score: 50, combo: 3 });
    expect(r.delta).toBe(-50);
    expect(r.next.score).toBe(0);
    expect(r.next.combo).toBe(0);
  });

  it('undo 错填不返还：recordedDelta<0 → delta=0', () => {
    const s: ScoreState = { score: 300, combo: 0 };
    const r = applyUndoFill(s, -100);
    expect(r.delta).toBe(0);
    expect(r.next.score).toBe(300);
  });

  it('redo 错填不重扣：recordedDelta<0 → delta=0', () => {
    const s: ScoreState = { score: 300, combo: 0 };
    const r = applyRedoFill(s, -100);
    expect(r.delta).toBe(0);
    expect(r.next.score).toBe(300);
  });
});
