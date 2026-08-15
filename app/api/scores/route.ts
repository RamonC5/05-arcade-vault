import { createClient } from "@/lib/supabase/service";

const NAME_MAX_LENGTH = 24;
const SCORE_MIN = 0;
const SCORE_MAX = 999_999_999;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "Cuerpo de la petición inválido." },
      { status: 400 },
    );
  }

  const { game_id, player_name, score } = body as Record<string, unknown>;

  if (typeof game_id !== "string" || game_id.trim() === "") {
    return Response.json({ error: "game_id es requerido." }, { status: 400 });
  }

  if (
    player_name !== undefined &&
    player_name !== null &&
    typeof player_name !== "string"
  ) {
    return Response.json(
      { error: "player_name debe ser texto." },
      { status: 400 },
    );
  }

  const trimmedName = typeof player_name === "string" ? player_name.trim() : "";
  if (trimmedName.length > NAME_MAX_LENGTH) {
    return Response.json(
      {
        error: `player_name no puede superar los ${NAME_MAX_LENGTH} caracteres.`,
      },
      { status: 400 },
    );
  }
  const name = trimmedName === "" ? "INVITADO" : trimmedName;

  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < SCORE_MIN ||
    score > SCORE_MAX
  ) {
    return Response.json(
      { error: `score debe ser un entero entre ${SCORE_MIN} y ${SCORE_MAX}.` },
      { status: 400 },
    );
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("scores")
    .insert({ game_id, player_name: name, score });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
