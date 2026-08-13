"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Pencil, PiggyBank, Percent, CalendarDays, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts } from "@/lib/data/accounts";
import { listDebts, createDebt, updateDebt, deleteDebt } from "@/lib/data/debts";
import { computeDebtStatus, formatBRL, formatDatePt, parseBRNumber, round2, toISODate } from "@/lib/finance/core";

function emptyForm(accountId) {
  return {
    nome: "", valorTotal: "", parcela: "", totalParcelas: "",
    dataPrimeiraParcela: toISODate(new Date()), taxaJuros: "", contaId: accountId || "",
  };
}

export default function DividasPage() {
  const supabase = createClient();
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const reload = useCallback(async (hid) => {
    const [accs, dbts] = await Promise.all([listAccounts(supabase, hid), listDebts(supabase, hid)]);
    setAccounts(accs);
    setDebts(dbts);
    if (accs.length) setForm((f) => ({ ...f, contaId: f.contaId || accs[0].id }));
  }, [supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hid = await getMyHouseholdId(supabase);
      setHouseholdId(hid);
      if (hid) await reload(hid);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accountName = useCallback((id) => accounts.find((a) => a.id === id)?.name || "—", [accounts]);

  const totalRestante = useMemo(
    () => round2(debts.reduce((sum, d) => sum + computeDebtStatus(d, today).valorRestante, 0)),
    [debts, today]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const valorTotal = parseBRNumber(form.valorTotal);
    const parcela = parseBRNumber(form.parcela);
    const totalParcelas = parseInt(form.totalParcelas, 10);
    if (!form.nome.trim()) { showToast("Dê um nome para a dívida."); return; }
    if (!parcela || isNaN(parcela) || parcela <= 0) { showToast("Informe o valor da parcela (ex: 800,00)."); return; }
    if (!totalParcelas || totalParcelas <= 0) { showToast("Informe o número de parcelas."); return; }
    if (!form.dataPrimeiraParcela) { showToast("Informe a data da 1ª parcela."); return; }
    if (!form.contaId) { showToast("Selecione uma conta de pagamento."); return; }

    setBusy(true);
    try {
      const taxa = parseBRNumber(form.taxaJuros);
      const payload = {
        nome: form.nome.trim(),
        valor_total: round2((!isNaN(valorTotal) && valorTotal > 0) ? valorTotal : parcela * totalParcelas),
        parcela: round2(parcela),
        total_parcelas: totalParcelas,
        data_primeira_parcela: form.dataPrimeiraParcela,
        taxa_juros: isNaN(taxa) ? 0 : taxa,
        conta_id: form.contaId,
      };
      if (editingId) {
        await updateDebt(supabase, editingId, payload);
        showToast("Dívida atualizada.");
      } else {
        await createDebt(supabase, householdId, payload);
        showToast("Dívida cadastrada.");
      }
      await reload(householdId);
      setForm(emptyForm(form.contaId));
      setEditingId(null);
      setShowForm(false);
    } catch {
      showToast("Não consegui salvar a dívida.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(debt) {
    setForm({
      nome: debt.nome, valorTotal: String(debt.valor_total), parcela: String(debt.parcela),
      totalParcelas: String(debt.total_parcelas), dataPrimeiraParcela: debt.data_primeira_parcela,
      taxaJuros: String(debt.taxa_juros || ""), contaId: debt.conta_id,
    });
    setEditingId(debt.id);
    setShowForm(true);
  }

  async function handleDelete(debt) {
    if (!window.confirm("Remover esta dívida? Essa ação não pode ser desfeita.")) return;
    await deleteDebt(supabase, debt.id);
    setDebts((prev) => prev.filter((d) => d.id !== debt.id));
    showToast("Dívida removida.");
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Dívidas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Financiamentos, empréstimos ou parcelamentos fora do cartão.
        </p>
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "white" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--ink-soft)" }}>Total ainda devendo</span>
          <span className="font-mono tabular text-lg font-medium" style={{ color: totalRestante > 0 ? "var(--rose)" : "var(--teal)" }}>{formatBRL(totalRestante)}</span>
        </div>
      </div>

      {debts.length === 0 && !showForm && (
        <div className="text-sm rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}>
          Nenhuma dívida cadastrada ainda.
        </div>
      )}

      <div className="space-y-3">
        {debts.map((d) => {
          const st = computeDebtStatus(d, today);
          const pct = st.total > 0 ? Math.round((st.pagas / st.total) * 100) : 0;
          return (
            <div key={d.id} className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <PiggyBank size={14} style={{ color: "var(--brick)" }} /> {d.nome}
                    {st.quitada && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ background: "#e8f3f0", color: "var(--teal)" }}>quitada</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
                    {formatBRL(d.parcela)}/mês · paga com {accountName(d.conta_id)}
                    {d.taxa_juros ? <> · <Percent size={10} className="inline" /> {d.taxa_juros}% a.m.</> : null}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(d)} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(d)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--teal)" }} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p style={{ color: "var(--ink-soft)" }}>Parcelas</p>
                  <p className="font-mono tabular font-medium">{st.pagas}/{st.total}</p>
                </div>
                <div>
                  <p style={{ color: "var(--ink-soft)" }}>Falta pagar</p>
                  <p className="font-mono tabular font-medium" style={{ color: "var(--rose)" }}>{formatBRL(st.valorRestante)}</p>
                </div>
                <div>
                  <p style={{ color: "var(--ink-soft)" }}><CalendarDays size={10} className="inline mr-0.5" /> Próx. venc.</p>
                  <p className="font-mono tabular font-medium">{st.proximoVencimento ? formatDatePt(st.proximoVencimento) : "—"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { setShowForm((s) => !s); setEditingId(null); setForm(emptyForm(accounts[0]?.id)); }}
        className="text-sm px-3.5 py-2 rounded-lg border bg-white flex items-center gap-1.5" style={{ borderColor: "var(--border)" }}
      >
        <Plus size={14} /> {showForm ? "Fechar formulário" : "Cadastrar dívida"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
          <Field label="Nome da dívida">
            <input required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Financiamento do carro" className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor da parcela (R$)">
              <input required type="text" inputMode="decimal" placeholder="0,00" value={form.parcela} onChange={(e) => setForm((f) => ({ ...f, parcela: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="Total de parcelas">
              <input required type="number" min="1" value={form.totalParcelas} onChange={(e) => setForm((f) => ({ ...f, totalParcelas: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="Data da 1ª parcela">
              <input required type="date" value={form.dataPrimeiraParcela} onChange={(e) => setForm((f) => ({ ...f, dataPrimeiraParcela: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="Taxa de juros (% a.m., opcional)">
              <input type="text" inputMode="decimal" placeholder="0,00" value={form.taxaJuros} onChange={(e) => setForm((f) => ({ ...f, taxaJuros: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="Valor total (opcional)">
              <input type="text" inputMode="decimal" value={form.valorTotal} onChange={(e) => setForm((f) => ({ ...f, valorTotal: e.target.value }))}
                placeholder="calculado se vazio" className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="Conta de pagamento">
              <select value={form.contaId} onChange={(e) => setForm((f) => ({ ...f, contaId: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-sm px-3.5 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
              {editingId ? "Salvar alterações" : "Cadastrar dívida"}
            </button>
          </div>
        </form>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50" style={{ background: "var(--ink)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>{label}</span>
      {children}
    </label>
  );
}
