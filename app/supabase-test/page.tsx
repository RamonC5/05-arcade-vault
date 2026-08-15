"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "connected" | "error";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        setStatus("connected");
        setMessage(
          data.session
            ? `Sesión activa: ${data.session.user.email ?? data.session.user.id}`
            : "Sin sesión activa (esperado sin login todavía).",
        );
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : String(err));
      });
  }, []);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "80px auto",
        padding: "0 24px",
        fontFamily: "var(--mono)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "var(--ink-faint)",
          marginBottom: 16,
        }}
      >
        ▸ SUPABASE SMOKE TEST
      </p>

      {status === "loading" && (
        <h1 className="mono" style={{ color: "var(--ink-dim)" }}>
          Conectando…
        </h1>
      )}

      {status === "connected" && (
        <>
          <h1 className="neon-green mono" style={{ fontSize: 28 }}>
            Conectado ✅
          </h1>
          <p style={{ color: "var(--ink-dim)", marginTop: 12 }}>{message}</p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="neon-magenta mono" style={{ fontSize: 28 }}>
            Error ❌
          </h1>
          <p style={{ color: "var(--ink-dim)", marginTop: 12 }}>{message}</p>
        </>
      )}
    </div>
  );
}
