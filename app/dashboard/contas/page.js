"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Wallet, CreditCard, Link2, RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts, createAccount, updateAccount, deleteAccount } from "@/lib/data/accounts";
import { listAllTransactions } from "@/lib/data/transactions";
import { listDebts } from "@/lib/data/debts";
import { listCustomCategories } from "@/lib/data/categories";
import {
  computeAccountBalance, computeCardInvoices, formatBucketLabel, formatBRL, parseBRNumber, toISODate,
  mergeCategories,
} from "@/lib/finance/core";

export default function ContasPage() {
  const supabase = createClient();
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const allCategories = useMemo(() => mergeCategories(customCategories), [customCategories]);
  const [toast, setToast] = useState("");

  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("conta");

  const [pluggyItemId, setPluggyItemId] = useState("");
  const [pluggyPreview, setPluggyPreview] = useState(null);
  const [pluggyMappings, setPluggyMappings] = useState({});
  const [linkingPluggy, setLinkingPluggy] = useState(false);

  const [syncingAccountId, setSyncingAccountId] = useState(null);
  const [syncReview, setSyncReview] = useState(null); // { accountId, accountName, drafts }
  const [savingSyncCommit, setSavingSyncCommit] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const reload = useCallback(async (hid) => {
    const [accs, txs, dbts, cats] = await Promise.all([
      listAccounts(supabase, hid),
      listAllTransactions(supabase, hid),
      listDebts(supabase, hid),
      listCustomCategories(supabase, hid),
    ]);
    setAccounts(accs);
    setTransactions(txs);
    setDebts(dbts);
    setCustomCategories(cats);
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

  async function handleFetchPluggyPreview() {
    if (!pluggyItemId.trim()) { showToast("Cole o ID da conexão primeiro."); return; }
    setLinkingPluggy(true);
    setPluggyPreview(null);
    try {
      const res = await fetch(`/api/pluggy/test-connection?itemId=${encodeURIComponent(pluggyItemId.trim())}`);
      const data = await res.json();
      if (data.error) { showToast(data.error); return; }
      setPluggyPreview(data);
      const initial = {};
      data.contas.forEach((c) => { initial[c.pluggyAccountId] = ""; });
      setPluggyMappings(initial);
    } catch {
      showToast("Não consegui buscar essa conexão.");
    } finally {
      setLinkingPluggy(false);
    }
  }

  async function handleConfirmPluggyLinks() {
    setLinkingPluggy(true);
    try {
      const links = [];
      for (const conta of pluggyPreview.contas) {
        const escolha = pluggyMappings[conta.pluggyAccountId];
        if (!escolha) continue;
        let accountId = escolha;
        if (escolha === "__novo__") {
          const fields = conta.tipoSugerido === "cartao"
            ? { name: conta.name, type: "cartao", limite: conta.limite || 1000, dia_fechamento: conta.diaFechamento || 25, dia_vencimento: conta.diaVencimento || 5 }
            : { name: conta.name, type: "conta", saldo_inicial: 0 };
          const created = await createAccount(supabase, householdId, fields);
          accountId = created.id;
        }
        links.push({ accountId, pluggyAccountId: conta.pluggyAccountId });
      }
      if (links.length === 0) { showToast("Escolha pelo menos uma conta pra vincular."); setLinkingPluggy(false); return; }

      const res = await fetch("/api/pluggy/link-item", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: pluggyItemId.trim(), connectorName: pluggyPreview.conector, status: pluggyPreview.status, links }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`${links.length} conta(s) vinculada(s) ao banco.`);
      setPluggyPreview(null);
      setPluggyItemId("");
      await reload(householdId);
    } catch (e) {
      showToast(e.message || "Não consegui vincular as contas.");
    } finally {
      setLinkingPluggy(false);
    }
  }

  async function handleSyncAccount(account) {
    setSyncingAccountId(account.id);
    try {
      const res = await fetch("/api/pluggy/sync-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.novas === 0) { showToast("Nenhum lançamento novo pra importar."); return; }
      setSyncReview({ accountId: account.id, accountName: data.accountName, drafts: data.drafts });
    } catch (e) {
      showToast(e.message || "Não consegui buscar as transações do banco.");
    } finally {
      setSyncingAccountId(null);
    }
  }

  function updateSyncDraft(index, field, value) {
    setSyncReview((prev) => {
      const drafts = [...prev.drafts];
      drafts[index] = { ...drafts[index], [field]: value };
      return { ...prev, drafts };
    });
  }

  function removeSyncDraft(index) {
    setSyncReview((prev) => ({ ...prev, drafts: prev.drafts.filter((_, i) => i !== index) }));
  }

  async function handleConfirmSync() {
    if (!syncReview || syncReview.drafts.length === 0) return;
    setSavingSyncCommit(true);
    try {
      const res = await fetch("/api/pluggy/sync-commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: syncReview.drafts }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast(`${data.importados} lançamento(s) importado(s).`);
      setSyncReview(null);
      await reload(householdId);
    } catch (e) {
      showToast(e.message || "Não consegui importar os lançamentos.");
    } finally {
      setSavingSyncCommit(false);
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
                  <div className="flex items-center gap-1">
                    {a.pluggy_account_id && (
                      <button
                        onClick={() => handleSyncAccount(a)} disabled={syncingAccountId === a.id}
                        title="Sincronizar com o banco" className="text-slate-400 hover:text-teal-600 disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={syncingAccountId === a.id ? "animate-spin" : ""} />
                      </button>
                    )}
                    <button onClick={() => handleRemoveAccount(a)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
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
                <div className="flex items-center gap-1">
                  {a.pluggy_account_id && (
                    <button
                      onClick={() => handleSyncAccount(a)} disabled={syncingAccountId === a.id}
                      title="Sincronizar com o banco" className="text-slate-400 hover:text-teal-600 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={syncingAccountId === a.id ? "animate-spin" : ""} />
                    </button>
                  )}
                  <button onClick={() => handleRemoveAccount(a)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
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

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: "var(--ink)" }}><Link2 size={15} /> Conectar com o banco</p>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
          Cole o ID de uma conexão do seu Dashboard da Pluggy pra vincular as contas de lá com as suas aqui.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            value={pluggyItemId} onChange={(e) => setPluggyItemId(e.target.value)}
            placeholder="ID da conexão"
            className="flex-1 text-sm px-3 py-2 rounded-lg border font-mono" style={{ borderColor: "var(--border)" }}
          />
          <button
            onClick={handleFetchPluggyPreview} disabled={linkingPluggy}
            className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60 shrink-0" style={{ background: "var(--ink)" }}
          >
            {linkingPluggy ? "Buscando…" : "Buscar contas"}
          </button>
        </div>

        {pluggyPreview && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--teal)" }}>Conectado: {pluggyPreview.conector}</p>
            {pluggyPreview.contas.map((c) => (
              <div key={c.pluggyAccountId} className="flex items-center gap-2 text-xs">
                <span className="flex-1">{c.name} <span style={{ color: "var(--ink-soft)" }}>({c.tipoSugerido}, {formatBRL(c.saldo)})</span></span>
                <select
                  value={pluggyMappings[c.pluggyAccountId] || ""}
                  onChange={(e) => setPluggyMappings((prev) => ({ ...prev, [c.pluggyAccountId]: e.target.value }))}
                  className="text-xs px-2 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)" }}
                >
                  <option value="">Não vincular</option>
                  <option value="__novo__">+ Criar conta nova</option>
                  {accounts.filter((a) => a.type === c.tipoSugerido).map((a) => (
                    <option key={a.id} value={a.id}>Usar: {a.name}</option>
                  ))}
                </select>
              </div>
            ))}
            <button
              onClick={handleConfirmPluggyLinks} disabled={linkingPluggy}
              className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--teal)" }}
            >
              {linkingPluggy ? "Vinculando…" : "Confirmar vínculo"}
            </button>
          </div>
        )}
      </div>

      {syncReview && (
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Revisar importação — {syncReview.accountName}</p>
            <button onClick={() => setSyncReview(null)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
            Confira a categoria de cada lançamento antes de importar — o banco não sabe como vocês organizam as categorias.
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto mb-3">
            {syncReview.drafts.map((d, i) => (
              <div
                key={d.externalId}
                className="rounded-lg p-2"
                style={{ background: d.possibleDuplicate ? "#faf1e6" : "var(--paper)", border: d.possibleDuplicate ? "1px solid #f0d9b5" : "none" }}
              >
                {d.possibleDuplicate && (
                  <p className="text-[11px] flex items-center gap-1 mb-1.5" style={{ color: "var(--amber)" }}>
                    <AlertTriangle size={11} className="shrink-0" />
                    Parece com "{d.possibleDuplicate.note || "um lançamento"}" que você já tem em {d.possibleDuplicate.date.split("-").reverse().join("/")} — confira se não é a mesma coisa.
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0" style={{ color: "var(--ink-soft)" }}>{d.date.split("-").reverse().join("/")}</span>
                  <span className="flex-1 truncate" title={d.note}>{d.note || "—"}</span>
                  <select
                    value={d.categoryId}
                    onChange={(e) => {
                      const cat = allCategories.find((c) => c.id === e.target.value);
                      updateSyncDraft(i, "categoryId", e.target.value);
                      updateSyncDraft(i, "subcategory", cat?.subcategories[0] || "");
                    }}
                    className="text-xs px-1.5 py-1 rounded border" style={{ borderColor: "var(--border)" }}
                  >
                    {allCategories.filter((c) => (d.type === "receita" ? c.group === "receita" : c.group !== "receita")).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <span className="w-20 text-right font-mono tabular shrink-0" style={{ color: d.type === "receita" ? "var(--teal)" : "var(--rose)" }}>
                    {formatBRL(d.value)}
                  </span>
                  <button onClick={() => removeSyncDraft(i)} className="text-slate-400 hover:text-rose-600 shrink-0" title="Não importar esse"><X size={13} /></button>
                </div>
              </div>
            ))}
            {syncReview.drafts.length === 0 && <p className="text-xs text-center py-4" style={{ color: "var(--ink-soft)" }}>Nada pra importar.</p>}
          </div>
          <button
            onClick={handleConfirmSync} disabled={savingSyncCommit || syncReview.drafts.length === 0}
            className="text-sm px-3.5 py-2 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: "var(--ink)" }}
          >
            <Check size={14} /> {savingSyncCommit ? "Importando…" : `Confirmar importação (${syncReview.drafts.length})`}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50" style={{ background: "var(--ink)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
