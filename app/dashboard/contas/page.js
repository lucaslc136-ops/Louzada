"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Wallet, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts, createAccount, updateAccount, deleteAccount } from "@/lib/data/accounts";
import { listAllTransactions } from "@/lib/data/transactions";
import { listDebts } from "@/lib/data/debts";
import {
  computeAccountBalance, computeCardInvoices, formatBucketLabel, formatBRL, parseBRNumber, toISODate,
} from "@/lib/finance/core";

export default function ContasPage() {
  const supabase = createClient();
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [toast, setToast] = useState("");

  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("conta");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const reload = useCallback(async (hid) => {
    const [accs, txs, dbts] = await Promise.all([
      listAccounts(supabase, hid),
      listAllTransactions(supabase, hid),
      listDebts(supabase, hid),
    ]);
    setAccounts(accs);
    setTransactions(txs);
    setDebts(dbts);
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

  async function handleAddAccount() {
    if (!newAccountName.trim() || !householdId) return;
    try {
      const fields = newAccountType === "cartao"
        ? { name: newAccountName.trim(), type: "cartao", limite: 1000, dia_fechamento: 25, dia_vencimento: 5 }
        : { name: newAccountName.trim(), type: "conta", saldo_inicial: 0 };
      const acc = await createAccount(supabase, householdId, fields);
      setAccounts((prev) => (prev.some((a) => a.id === acc.id) ? prev : [...prev, acc]));
      setNewAccountName("");
      showToast("Conta adicionada.");
    } catch {
      showToast("Não consegui adicionar a conta.");
    }
  }

  async function handleFieldChange(account, field, rawValue) {
    let value = rawValue;
    if (field === "saldo_inicial" || field === "limite") {
      value = rawValue; // texto livre (aceita vírgula); interpretado na hora de exibir
    } else if (field === "dia_fechamento" || field === "dia_vencimento") {
      value = parseInt(rawValue, 10) || 1;
    }
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, [field]: value } : a)));
    try {
      await updateAccount(supabase, account.id, { [field]: value });
    } catch {
      showToast("Não consegui salvar essa alteração.");
    }
  }

  async function handleRemoveAccount(account) {
    if (accounts.length <= 1) { showToast("Mantenha ao menos uma conta cadastrada."); return; }
    const inUse = transactions.some((t) => t.account_id === account.id) || debts.some((d) => d.conta_id === account.id);
    if (inUse) {
      const ok = window.confirm("Essa conta tem lançamentos ou dívidas associadas. Remover mesmo assim?");
      if (!ok) return;
    }
    await deleteAccount(supabase, account.id);
    setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    showToast("Conta removida.");
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Contas &amp; Cartões</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          Saldo e fatura calculados automaticamente a partir dos seus lançamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {accounts.map((a) => {
          if (a.type === "cartao") {
            const inv = computeCardInvoices(a, transactions, today);
            const limiteParsed = parseBRNumber(a.limite);
            const limite = isNaN(limiteParsed) ? 0 : limiteParsed;
            const usadoPct = limite > 0 ? Math.min(100, Math.round((inv.currentTotal / limite) * 100)) : 0;
            const disponivel = Math.round((limite - inv.currentTotal) * 100) / 100;
            return (
              <div key={a.id} className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <CreditCard size={15} style={{ color: "var(--brick)" }} />
                    <input
                      value={a.name}
                      onChange={(e) => handleFieldChange(a, "name", e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 focus:outline-none"
                    />
                  </span>
                  <button onClick={() => handleRemoveAccount(a)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <label className="block">
                    <span style={{ color: "var(--ink-soft)" }}>Limite (R$)</span>
                    <input type="text" inputMode="decimal" placeholder="0,00" value={a.limite ?? ""} onChange={(e) => handleFieldChange(a, "limite", e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 rounded border text-sm" style={{ borderColor: "var(--border)" }} />
                  </label>
                  <div className="flex gap-1">
                    <label className="block flex-1">
                      <span style={{ color: "var(--ink-soft)" }}>Fecha dia</span>
                      <input type="number" min="1" max="28" value={a.dia_fechamento ?? 25} onChange={(e) => handleFieldChange(a, "dia_fechamento", e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 rounded border text-sm" style={{ borderColor: "var(--border)" }} />
                    </label>
                    <label className="block flex-1">
                      <span style={{ color: "var(--ink-soft)" }}>Vence dia</span>
                      <input type="number" min="1" max="28" value={a.dia_vencimento ?? 5} onChange={(e) => handleFieldChange(a, "dia_vencimento", e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 rounded border text-sm" style={{ borderColor: "var(--border)" }} />
                    </label>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${usadoPct}%`, background: usadoPct > 85 ? "var(--rose)" : "var(--brick)" }} />
                </div>

                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--ink-soft)" }}>Fatura de {formatBucketLabel(inv.currentBucket)}</span>
                  <span className="font-mono tabular font-medium">{formatBRL(inv.currentTotal)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--ink-soft)" }}>Fatura de {formatBucketLabel(inv.nextBucket)}</span>
                  <span className="font-mono tabular">{formatBRL(inv.nextTotal)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--ink-soft)" }}>Limite disponível</span>
                  <span className="font-mono tabular font-medium" style={{ color: disponivel >= 0 ? "var(--teal)" : "var(--rose)" }}>{formatBRL(disponivel)}</span>
                </div>
              </div>
            );
          }
          const saldo = computeAccountBalance(a, transactions, today);
          return (
            <div key={a.id} className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Wallet size={15} style={{ color: "var(--teal)" }} />
                  <input
                    value={a.name}
                    onChange={(e) => handleFieldChange(a, "name", e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 focus:outline-none"
                  />
                </span>
                <button onClick={() => handleRemoveAccount(a)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
              <label className="block text-xs mb-3">
                <span style={{ color: "var(--ink-soft)" }}>Saldo inicial (R$)</span>
                <input type="text" inputMode="decimal" placeholder="0,00" value={a.saldo_inicial ?? ""} onChange={(e) => handleFieldChange(a, "saldo_inicial", e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded border text-sm" style={{ borderColor: "var(--border)" }} />
              </label>
              <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--ink-soft)" }}>Saldo atual</span>
                <span className="font-mono tabular font-medium" style={{ color: saldo >= 0 ? "var(--teal)" : "var(--rose)" }}>{formatBRL(saldo)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>Adicionar nova conta ou cartão</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="Nome (ex: Itaú, Cartão Inter)"
            className="flex-1 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: "var(--border)" }}
          />
          <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <option value="conta">Conta</option>
            <option value="cartao">Cartão</option>
          </select>
          <button onClick={handleAddAccount} className="text-sm px-3 py-2 rounded-lg text-white flex items-center gap-1 justify-center" style={{ background: "var(--ink)" }}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50" style={{ background: "var(--ink)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
