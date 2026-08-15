import { getGames, getLeaderboard } from "@/lib/queries";
import type { LeaderboardEntry } from "@/lib/types";
import HallOfFame from "./HallOfFame";

export default async function HallOfFamePage() {
  const games = await getGames();

  const leaderboards = await Promise.all(
    games.map((game) => getLeaderboard(game.id, 12)),
  );

  const leaderboardsByGame: Record<string, LeaderboardEntry[]> = {};
  games.forEach((game, i) => {
    leaderboardsByGame[game.id] = leaderboards[i];
  });

  return <HallOfFame games={games} leaderboardsByGame={leaderboardsByGame} />;
}
