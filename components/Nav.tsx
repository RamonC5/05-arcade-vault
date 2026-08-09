"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setStoredUser, useStoredUser } from "@/lib/session";

type NavSection = "biblioteca" | "salon" | "auth";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useStoredUser();

  const isActive = (name: NavSection) => {
    if (name === "biblioteca") return pathname === "/biblioteca" || pathname.startsWith("/juego");
    if (name === "salon") return pathname.startsWith("/salon");
    return pathname.startsWith("/auth");
  };

  const close = () => setOpen(false);

  const handleSignOut = () => {
    setStoredUser(null);
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/biblioteca" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={isActive("salon") ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        {!user && (
          <Link href="/auth" className={isActive("auth") ? "active" : ""} onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--color-av-ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
