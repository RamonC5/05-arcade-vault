import { getGames } from "@/lib/queries";
import GamesGrid from "./GamesGrid";

export default async function Biblioteca() {
  const games = await getGames();

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <GamesGrid games={games} />
    </div>
  );
}
