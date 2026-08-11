export interface ScoreState {
  score: number;
  combo: number;
}

export interface ScoreResult {
  next: ScoreState;
  delta: number;
}

export function applyFillCorrect(s: ScoreState): ScoreResult {
  const combo = s.combo + 1;
  const delta = 100 + (combo >= 3 ? 20 : 0);
  return { next: { score: s.score + delta, combo }, delta };
}

export function applyFillWrong(s: ScoreState): ScoreResult {
  const delta = s.score > 0 ? -Math.min(100, s.score) : 0;
  return { next: { score: s.score + delta, combo: 0 }, delta };
}

export function applyUndoFill(s: ScoreState, recordedDelta: number): ScoreResult {
  const delta = recordedDelta > 0 && s.score > 0 ? -Math.min(recordedDelta, s.score) : 0;
  return { next: { score: s.score + delta, combo: 0 }, delta };
}

export function applyRedoFill(s: ScoreState, recordedDelta: number): ScoreResult {
  const delta = recordedDelta > 0 ? recordedDelta : 0;
  return { next: { score: s.score + delta, combo: 0 }, delta };
}

export function applyErase(s: ScoreState, erasedCellCorrect: boolean): ScoreResult {
  const delta = erasedCellCorrect && s.score > 0 ? -Math.min(100, s.score) : 0;
  return { next: { score: s.score + delta, combo: 0 }, delta };
}
