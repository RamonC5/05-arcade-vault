import { notFound } from "next/navigation";
import { getGameById } from "@/lib/queries";
import AsteroidesPlayer from "./AsteroidesPlayer";

export default async function AsteroidesPlayPage() {
  const game = await getGameById("asteroides");

  if (!game) notFound();

  return <AsteroidesPlayer game={game} />;
}
