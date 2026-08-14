"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Copy, LogOut, LayoutDashboard, Receipt, Landmark, PiggyBank, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Visão Geral", Icon: LayoutDashboard },
  { href: "/dashboard/lancamentos", label: "Lançamentos", Icon: Receipt },
  { href: "/dashboard/contas", label: "Contas & Cartões", Icon: Landmark },
  { href: "/dashboard/dividas", label: "Dívidas", Icon: PiggyBank },
  { href: "/dashboard/financiamento", label: "Financiamento", Icon: Calculator },
];

export default function DashboardHeader({ userEmail, householdName, inviteCode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <LogoLockup height={38} />
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs" style={{ color: "var(--ink)" }}>{householdName}</p>
            <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{userEmail}</p>
          </div>
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

      <nav className="max-w-3xl mx-auto px-4 sm:px-6 pb-3 overflow-x-auto">
        <div className="flex gap-1.5 rounded-xl p-1 border w-max sm:w-full" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:flex-1 rounded-lg transition-colors whitespace-nowrap"
                style={active ? { background: "var(--ink)", color: "white" } : { color: "var(--ink-soft)" }}
              >
                <item.Icon size={14} /> {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
