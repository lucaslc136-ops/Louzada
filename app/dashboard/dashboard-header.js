"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Copy, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardHeader({ userEmail, householdName, inviteCode }) {
  const router = useRouter();
  const supabase = createClient();
  const [copyMsg, setCopyMsg] = useState("");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyMsg("Copiado!");
    } catch {
      setCopyMsg(`Código: ${inviteCode}`);
    }
    setTimeout(() => setCopyMsg(""), 3000);
  }

  return (
    <header className="border-b bg-white" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--brick)" }}>
            <Home size={11} className="inline mr-1" />
            {householdName || "Planejamento Financeiro"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>{userEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyInvite}
            title="Convidar alguém pra essa família"
            className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}
          >
            <Copy size={12} /> {copyMsg || `Convite: ${inviteCode}`}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs hover:text-rose-600" style={{ color: "var(--ink-soft)" }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>
    </header>
  );
}
