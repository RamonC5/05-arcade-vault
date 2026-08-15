import { createClient } from "./supabase/server";
import type { Game, GameWithStats, LeaderboardEntry } from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Devuelve el catálogo completo de juegos, con `best`/`plays` calculados
 * a partir de `scores` (`MAX(score)` / `COUNT(*)` por juego).
 */
export async function getGames(): Promise<GameWithStats[]> {
  const supabase = await createClient();

  const [gamesRes, scoresRes] = await Promise.all([
    supabase.from("games").select("*").order("created_at"),
    supabase.from("scores").select("game_id, score"),
  ]);

  if (gamesRes.error) throw gamesRes.error;
  if (scoresRes.error) throw scoresRes.error;

  const statsByGame = new Map<string, { best: number; plays: number }>();
  for (const row of scoresRes.data ?? []) {
    const current = statsByGame.get(row.game_id) ?? { best: 0, plays: 0 };
    current.best = Math.max(current.best, row.score);
    current.plays += 1;
    statsByGame.set(row.game_id, current);
  }

  return (gamesRes.data ?? []).map((game) => {
    const stats = statsByGame.get(game.id);
    return {
      ...(game as Game),
      best: stats?.best ?? 0,
      plays: stats?.plays ?? 0,
    };
  });
}

/**
 * Devuelve un juego por `id` con sus estadísticas, o `null` si no existe.
 */
export async function getGameById(id: string): Promise<GameWithStats | null> {
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (gameError) throw gameError;
  if (!game) return null;

  const { data: scores, error: scoresError } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", id);

  if (scoresError) throw scoresError;

  const best = (scores ?? []).reduce((max, row) => Math.max(max, row.score), 0);
  const plays = scores?.length ?? 0;

  return { ...(game as Game), best, plays };
}

/**
 * Devuelve el top `limit` de puntuaciones de un juego, ordenadas de mayor
 * a menor.
 */
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
