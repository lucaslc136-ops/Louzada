import { createClient } from "@/lib/supabase/server";
import { CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // consulta simples só pra confirmar que login + banco de dados + segurança por família estão
  // funcionando de ponta a ponta antes de portarmos as telas de verdade (lançamentos, dashboard etc.)
  const { data: accounts, error } = await supabase.from("accounts").select("id, name").limit(5);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Base conectada</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Login, banco de dados e as regras de segurança da família já estão funcionando. As telas de
          verdade (lançamentos, dashboard, dívidas, meta do imóvel) entram nos próximos passos.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        {error ? (
          <p className="text-sm" style={{ color: "var(--rose)" }}>
            Não consegui consultar o banco ainda ({error.message}). Confira se você já rodou o
            supabase/schema.sql e se as variáveis de ambiente estão certas na Vercel.
          </p>
        ) : (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={16} style={{ color: "var(--teal)" }} className="shrink-0 mt-0.5" />
            <p>
              Conexão com o banco funcionando. Você tem <strong>{accounts.length}</strong> conta(s)
              cadastrada(s) até agora — é esperado que seja zero, ainda não construímos a tela de
              cadastro de contas aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
