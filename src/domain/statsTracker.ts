export type Stats = {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
};

export function createInitialStats(): Stats {
  return { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
}

export function recordResult(
  stats: Stats,
  winner: 'player' | 'cpu' | 'draw',
): Stats {
  const games = stats.games + 1;
  const wins = stats.wins + (winner === 'player' ? 1 : 0);
  const losses = stats.losses + (winner === 'cpu' ? 1 : 0);
  const draws = stats.draws + (winner === 'draw' ? 1 : 0);
  const winRate = Math.round((wins / games) * 10000) / 100;

  return { games, wins, losses, draws, winRate };
}
