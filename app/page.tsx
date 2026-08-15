import { getGames } from "@/lib/queries";
import HomeContent from "./HomeContent";

export default async function HomePage() {
  const games = await getGames();

  return <HomeContent games={games} />;
}
