"use client";

import { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { listAllTransactions, applyCategoryToIds } from "@/lib/data/transactions";
import { planAutoCategorization, categoryByIdIn, formatBRL } from "@/lib/finance/core";

// Cartão "Revisão rápida": conta quantos lançamentos aguardam revisão e, com um toque, mostra
// o que o app categorizaria sozinho (pelo seu histórico e pelo nome do estabelecimento) ANTES de
// gravar qualquer coisa. Só muda categoria, subcategoria e o aviso de revisão.
export default function AutoCategorize({ supabase, householdId, accountsMap, allCategories, onApplied, refreshKey }) {
  const [pending, setPending] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | plan | applying
  const [plan, setPlan] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count, error } = await supabase
          .from("transactions").select("id", { count: "exact", head: true })
          .eq("household_id", householdId).eq("needs_review", true);
        if (!error && !cancelled) setPending(count ?? 0);
      } catch {
        // contagem é só informativa
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, householdId, refreshKey]);

  async function handlePreview() {
    setState("loading");
    setMessage("");
    try {
      const all = await listAllTransactions(supabase, householdId);
      const groups = planAutoCategorization(all, accountsMap);
      setPlan(groups);
      setState("plan");
      if (groups.length === 0) setMessage("Não encontrei nada que eu consiga categorizar com segurança agora. Ao corrigir uma categoria, eu ofereço aplicar aos parecidos.");
    } catch {
      setState("idle");
      setMessage("Não consegui analisar seus lançamentos agora. Nada foi alterado.");
    }
  }

  async function handleApply() {
    setState("applying");
    try {
      for (const g of plan) await applyCategoryToIds(supabase, householdId, g.ids, g.categoryId, g.subcategory);
      const total = plan.reduce((s, g) => s + g.ids.length, 0);
      setPlan([]);
      setState("idle");
      setMessage(`${total} lançamento(s) categorizado(s).`);
      if (onApplied) await onApplied();
    } catch {
      setState("plan");
      setMessage("Não consegui aplicar tudo. Pode ter ficado parcial, é seguro tentar de novo.");
    }
  }

  const totalLancs = plan.reduce((s, g) => s + g.ids.length, 0);

  if (pending === 0 && state === "idle" && !message) return null;

  return (
    <div className="rounded-xl border bg-white p-4 mb-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
            <Wand2 size={14} /> Revisão rápida
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
            {pending === null ? "Verificando…" : `${pending} lançamento(s) aguardando revisão.`}
          </p>
        </div>
        {state === "idle" && (
          <button onClick={handlePreview} className="text-xs px-3 py-2 rounded-lg text-white shrink-0" style={{ background: "var(--ink)" }}>
            Categorizar automaticamente
          </button>
        )}
        {state === "loading" && <span className="text-xs" style={{ color: "var(--ink-soft)" }}>Analisando…</span>}
      </div>

      {state === "plan" && plan.length > 0 && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: "var(--ink)" }}>
            Vou categorizar {totalLancs} lançamento(s) em {plan.length} grupo(s). Confira antes de aplicar.
          </p>
          <ul className="divide-y text-xs rounded-lg border max-h-64 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
            {plan.slice(0, 40).map((g) => (
              <li key={`${g.descricao}|${g.categoryId}|${g.subcategory}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{g.descricao}</span>
                  <span style={{ color: "var(--ink-soft)" }}>
                    {categoryByIdIn(g.categoryId, allCategories)?.name}{g.subcategory ? ` · ${g.subcategory}` : ""} · {g.origem}
                  </span>
                </span>
                <span className="text-right shrink-0 tabular" style={{ color: "var(--ink-soft)" }}>
                  {g.ids.length}x · {formatBRL(g.total)}
                </span>
              </li>
            ))}
          </ul>
          {plan.length > 40 && <p className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>e mais {plan.length - 40} grupo(s)</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setPlan([]); setState("idle"); }} className="text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
            <button onClick={handleApply} className="text-xs px-3 py-2 rounded-lg text-white" style={{ background: "var(--ink)" }}>Aplicar tudo</button>
          </div>
        </div>
      )}
      {state === "applying" && <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>Aplicando…</p>}
      {message && <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>{message}</p>}
    </div>
  );
}
