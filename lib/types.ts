export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
}

export interface GameWithStats extends Game {
  best: number; // MAX(score) sobre scores, 0 si no hay ninguna
  plays: number; // COUNT(*) sobre scores
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  date: string; // created_at formateado
}
