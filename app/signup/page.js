"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message === "User already registered" ? "Esse e-mail já tem uma conta. Tente entrar." : "Não consegui criar sua conta. Tente de novo.");
      return;
    }
    // se a confirmação de e-mail estiver ativada no Supabase, ainda não há sessão aqui
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--paper)" }}>
        <div className="w-full max-w-sm bg-white rounded-xl border p-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-medium mb-2">Confira seu e-mail</p>
          <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Mandamos um link de confirmação pra {email}. Depois de confirmar, volte aqui e entre normalmente.
          </p>
          <Link href="/login" className="inline-block mt-4 text-xs underline" style={{ color: "var(--brick)" }}>Ir para o login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--paper)" }}>
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-[0.16em] mb-1 text-center" style={{ color: "var(--brick)" }}>
          Planejamento Financeiro
        </p>
        <h1 className="font-serif text-2xl text-center mb-8" style={{ color: "var(--ink)" }}>
          Criar conta
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--border)" }}>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Seu nome</span>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>E-mail</span>
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Senha</span>
            <input required type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
          </label>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full text-sm px-3.5 py-2.5 rounded-lg text-white disabled:opacity-60"
            style={{ background: "var(--ink)" }}
          >
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: "var(--ink-soft)" }}>
          Já tem conta?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--brick)" }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
