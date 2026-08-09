export type ScoreEntry = { game: string; score: number; name: string; at: number };

const KEY = "av_scores";

export function saveScore(entry: { game: string; score: number; name: string }): void {
  if (typeof window === "undefined") return;
  try {
    const all: ScoreEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // localStorage disabled (e.g. private mode) — save silently no-ops
  }
}
