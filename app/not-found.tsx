import Link from "next/link";

export default function NotFound() {
  return (
    <div className="av-notfound fade-in">
      <div className="code pixel neon-magenta flicker">404</div>
      <h1 className="pixel neon-cyan">GAME OVER</h1>
      <p className="mono">Esta pantalla no existe en este cartucho.</p>
      <Link href="/biblioteca" className="btn lg" style={{ marginTop: 28 }}>
        VOLVER AL VAULT
      </Link>
    </div>
  );
}
