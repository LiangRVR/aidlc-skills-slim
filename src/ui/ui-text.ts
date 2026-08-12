export function formatPlayerCount(n: number): string {
  return `在线 ${n}/2`;
}

export function formatScoreLine(label: string, score: number): string {
  return `${label}: ${score} 分`;
}
