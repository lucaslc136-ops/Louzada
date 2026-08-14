"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export default function DashboardTopbar({ userEmail, householdName, inviteCode }) {
  const [copyMsg, setCopyMsg] = useState("");

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--brick)" }}>{householdName}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{userEmail}</p>
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
        </div>
      </div>
    </header>
  );
}
