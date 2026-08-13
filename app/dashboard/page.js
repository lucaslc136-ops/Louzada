import { createClient } from "@/lib/supabase/server";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: accounts, error } = await supabase.from("accounts").select("id, name").limit(5);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Visão Geral</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Fase 1 no ar: lançamentos manuais e por linguagem natural, gravando direto no banco de vocês dois.
          O dashboard com gráficos entra numa próxima fase.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        {error ? (
          <p className="text-sm" style={{ color: "var(--rose)" }}>
            Não consegui consultar o banco ainda ({error.message}).
          </p>
        ) : (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={16} style={{ color: "var(--teal)" }} className="shrink-0 mt-0.5" />
            <p>Conexão com o banco funcionando. Você tem <strong>{accounts.length}</strong> conta(s) cadastrada(s).</p>
          </div>
        )}
      </div>

      <Link
        href="/dashboard/lancamentos"
        className="inline-block text-sm px-4 py-2.5 rounded-lg text-white"
        style={{ background: "var(--ink)" }}
      >
        Ir para Lançamentos →
      </Link>
    </div>
  );
}
