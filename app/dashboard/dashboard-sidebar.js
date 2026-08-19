"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Landmark, PiggyBank, Calculator, Plus, Settings, TrendingUp } from "lucide-react";
import { LogoIcon } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Visão Geral", Icon: LayoutDashboard },
  { href: "/dashboard/lancamentos", label: "Lançamentos", Icon: Receipt },
  { href: "/dashboard/contas", label: "Contas & Cartões", Icon: Landmark },
  { href: "/dashboard/dividas", label: "Dívidas", Icon: PiggyBank },
  { href: "/dashboard/financiamento", label: "Financiamento", Icon: Calculator },
  { href: "/dashboard/investimentos", label: "Investimentos", Icon: TrendingUp },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const settingsActive = pathname === "/dashboard/configuracoes";

  return (
    <aside
      className="w-16 sm:w-[72px] shrink-0 bg-white border-r flex flex-col items-center py-4 gap-1 sticky top-0 h-screen overflow-y-auto"
      style={{ borderColor: "var(--border)" }}
    >
      <Link href="/dashboard" className="mb-3 shrink-0" title="Louzada">
        <LogoIcon size={32} />
      </Link>

      <Link
        href="/dashboard/lancamentos"
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-white shadow-sm hover:opacity-90 transition-opacity shrink-0"
        style={{ background: "var(--brick)" }}
        title="Novo lançamento"
      >
        <Plus size={18} />
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative"
              style={active ? { background: "#fdf1ed", color: "var(--brick)" } : { color: "var(--ink-soft)" }}
            >
              {active && (
                <span
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                  style={{ background: "var(--brick)" }}
                />
              )}
              <item.Icon size={18} />
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard/configuracoes"
        title="Configurações"
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative"
        style={settingsActive ? { background: "#fdf1ed", color: "var(--brick)" } : { color: "var(--ink-soft)" }}
      >
        {settingsActive && (
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full" style={{ background: "var(--brick)" }} />
        )}
        <Settings size={18} />
      </Link>
    </aside>
  );
}
