"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não consegui entrar. Tente de novo."
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--paper)" }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <LogoLockup height={52} />
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)" }}>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>E-mail</span>
            <input
              required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Senha</span>
            <input
              required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
            />
          </label>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full text-sm px-3.5 py-2.5 rounded-lg text-white disabled:opacity-60"
            style={{ background: "var(--ink)" }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: "var(--ink-soft)" }}>
          Ainda não tem conta?{" "}
          <Link href="/signup" className="underline" style={{ color: "var(--brick)" }}>Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
