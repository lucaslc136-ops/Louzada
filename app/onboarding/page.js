"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/logo";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [name, setName] = useState("Família");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: rpcError } = await supabase.rpc("create_household", { p_name: name });
    setLoading(false);
    if (rpcError) {
      setError("Não consegui criar a família. Tente de novo.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: rpcError } = await supabase.rpc("join_household_by_code", { p_code: code });
    setLoading(false);
    if (rpcError) {
      setError(
        /invalid_code/.test(rpcError.message || "")
          ? "Não encontrei nenhuma família com esse código. Confira e tente de novo."
          : "Não consegui entrar nessa família. Tente de novo."
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--paper)" }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <LogoLockup height={40} />
        </div>
        <h1 className="font-serif text-2xl text-center mb-2" style={{ color: "var(--ink)" }}>Quase lá</h1>
        <p className="text-xs text-center mb-6" style={{ color: "var(--ink-soft)" }}>
          Crie sua família ou entre em uma que já existe com o código de convite.
        </p>

        <div className="flex gap-1.5 mb-4 rounded-xl p-1 bg-white border" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setMode("create")}
            className="flex-1 text-sm py-2 rounded-lg"
            style={mode === "create" ? { background: "var(--ink)", color: "white" } : { color: "var(--ink-soft)" }}
          >
            Criar família
          </button>
          <button
            onClick={() => setMode("join")}
            className="flex-1 text-sm py-2 rounded-lg"
            style={mode === "join" ? { background: "var(--ink)", color: "white" } : { color: "var(--ink-soft)" }}
          >
            Entrar com código
          </button>
        </div>

        {mode === "create" ? (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)" }}>
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Nome da família</span>
              <input required value={name} onChange={e => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </label>
            {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full text-sm px-3.5 py-2.5 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
              {loading ? "Criando…" : "Criar família e continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)" }}>
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Código de convite</span>
              <input required value={code} onChange={e => setCode(e.target.value)} placeholder="ex: a1b2c3d4"
                className="w-full text-sm px-3 py-2 rounded-lg border font-mono" style={{ borderColor: "var(--border)" }} />
            </label>
            {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full text-sm px-3.5 py-2.5 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
              {loading ? "Entrando…" : "Entrar na família"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
