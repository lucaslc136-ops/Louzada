"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wand2, Plus, Trash2, Pencil, X, Check, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw,
  Wallet, TrendingUp, TrendingDown, Scale, Receipt, SlidersHorizontal, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts, createAccount } from "@/lib/data/accounts";
import { listTransactionsForMonthWindow, listTransactionsForRange, createTransaction, updateTransaction, deleteTransaction, deleteTransactionGroup, deleteTransactionsByIds } from "@/lib/data/transactions";
import { listCustomCategories } from "@/lib/data/categories";
import {
  PAYMENT_METHODS, RECURRENCE_OPTIONS, MONTH_NAMES,
  categoryById, mergeCategories, categoryByIdIn, formatBRL, formatDatePt, parseBRNumber, parseNaturalLanguage, round2, toISODate,
  getEffectiveMonth, accountsToMap, formatBucketLabel, transactionsToCSV, downloadCSV,
} from "@/lib/finance/core";

function emptyForm() {
  const today = toISODate(new Date());
  return {
    type: "despesa", value: "", date: today, categoryId: "alimentacao",
    subcategory: "Mercado", accountId: "", paymentMethod: "Débito",
    installment: false, installmentsCount: 2, recurrence: "nenhuma", note: "",
  };
}

export default function LancamentosPage() {
  const supabase = createClient();
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [customRangeTx, setCustomRangeTx] = useState(null); // preenchido só quando o período personalizado está ativo
  const [rangeLoading, setRangeLoading] = useState(false);

  const [nlpText, setNlpText] = useState("");
  const [nlpPreview, setNlpPreview] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("conta");
  const [showAccountBox, setShowAccountBox] = useState(false);

  const [editingCategoryRowId, setEditingCategoryRowId] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const reloadTransactions = useCallback(async (hid, month) => {
    const tx = await listTransactionsForMonthWindow(supabase, hid, month);
    setTransactions(tx);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hid = await getMyHouseholdId(supabase);
      setHouseholdId(hid);
      if (hid) {
        const [accs, customCats] = await Promise.all([listAccounts(supabase, hid), listCustomCategories(supabase, hid)]);
        setAccounts(accs);
        setCustomCategories(customCats);
        if (accs.length && !form.accountId) {
          setForm((f) => ({ ...f, accountId: accs[0].id }));
        }
        await reloadTransactions(hid, monthCursor);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (householdId) reloadTransactions(householdId, monthCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor, householdId]);

  function shiftMonth(delta) {
    const [y, m] = monthCursor.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const monthLabel = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} de ${y}`;
  }, [monthCursor]);

  const accountsMap = useMemo(() => accountsToMap(accounts), [accounts]);
  const allCategories = useMemo(() => mergeCategories(customCategories), [customCategories]);

  // Lista: mostra o que foi comprado NESTE mês (data da compra), independente de cartão ou não.
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthCursor)).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, monthCursor]
  );

  // Se um período personalizado estiver ativo, ele substitui a lista do mês; senão, usa o mês normal.
  const baseTransactions = customRangeTx !== null ? customRangeTx : monthTransactions;

  // Filtros de conta/cartão, categoria e tipo — aplicados por cima da lista já carregada, sem nova busca.
  const filteredTransactions = useMemo(() => {
    return baseTransactions.filter((t) => {
      if (filterAccountId && t.account_id !== filterAccountId) return false;
      if (filterCategoryId && t.category_id !== filterCategoryId) return false;
      if (filterType && t.type !== filterType) return false;
      return true;
    });
  }, [baseTransactions, filterAccountId, filterCategoryId, filterType]);

  const filtersActive = !!(filterAccountId || filterCategoryId || filterType || customRangeTx !== null);

  // limpa a seleção sempre que a lista visível muda (mês, filtro etc.) — evita ficar com itens
  // "selecionados" que já nem aparecem mais na tela.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [monthCursor, filterAccountId, filterCategoryId, filterType, customRangeTx]);

  async function applyCustomRange() {
    if (!filterFrom || !filterTo) { showToast("Preencha as duas datas do período."); return; }
    setRangeLoading(true);
    try {
      const rows = await listTransactionsForRange(supabase, householdId, filterFrom, filterTo);
      setCustomRangeTx(rows.sort((a, b) => b.date.localeCompare(a.date)));
    } catch {
      showToast("Não consegui buscar esse período.");
    } finally {
      setRangeLoading(false);
    }
  }

  function clearAllFilters() {
    setFilterAccountId("");
    setFilterCategoryId("");
    setFilterType("");
    setFilterFrom("");
    setFilterTo("");
    setCustomRangeTx(null);
  }

  function handleExportCSV() {
    if (filteredTransactions.length === 0) { showToast("Não há lançamentos pra exportar."); return; }
    const csv = transactionsToCSV(filteredTransactions, accountsMap, allCategories);
    const nomeArquivo = filtersActive
      ? `lancamentos-filtrados-${toISODate(new Date())}.csv`
      : `lancamentos-${monthCursor}.csv`;
    downloadCSV(csv, nomeArquivo);
    showToast(`${filteredTransactions.length} lançamento(s) exportado(s).`);
  }

  // Totais: por padrão usam o mês de IMPACTO no fluxo de caixa — compra no cartão só conta no mês
  // em que a fatura vence, não no mês da compra. Mas quando algum filtro está ativo, os totais passam
  // a refletir exatamente a lista filtrada abaixo (senão os números do topo não bateriam com a tabela).
  const totals = useMemo(() => {
    if (filtersActive) {
      let receitas = 0, despesas = 0;
      for (const t of filteredTransactions) {
        if (t.type === "receita") receitas += Number(t.value); else despesas += Number(t.value);
      }
      return { receitas: round2(receitas), despesas: round2(despesas), saldo: round2(receitas - despesas), count: filteredTransactions.length };
    }
    let receitas = 0, despesas = 0;
    for (const t of transactions) {
      if (getEffectiveMonth(t, accountsMap) !== monthCursor) continue;
      if (t.type === "receita") receitas += Number(t.value); else despesas += Number(t.value);
    }
    return { receitas: round2(receitas), despesas: round2(despesas), saldo: round2(receitas - despesas), count: monthTransactions.length };
  }, [transactions, accountsMap, monthCursor, monthTransactions, filtersActive, filteredTransactions]);

  const accountName = useCallback((id) => accounts.find((a) => a.id === id)?.name || "—", [accounts]);
  const currentCategory = categoryByIdIn(form.categoryId, allCategories) || allCategories[0];

  async function handleAddAccount() {
    if (!newAccountName.trim() || !householdId) return;
    try {
      const acc = await createAccount(supabase, householdId, { name: newAccountName.trim(), type: newAccountType });
      setAccounts((prev) => (prev.some((a) => a.id === acc.id) ? prev : [...prev, acc]));
      if (!form.accountId) setForm((f) => ({ ...f, accountId: acc.id }));
      setNewAccountName("");
      showToast("Conta adicionada.");
    } catch (err) {
      showToast("Não consegui adicionar a conta.");
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    const value = parseBRNumber(form.value);
    if (!value || isNaN(value) || value <= 0) { showToast("Informe um valor válido (ex: 42,90)."); return; }
    if (!form.date) { showToast("Informe uma data."); return; }
    if (!form.accountId) { showToast("Selecione uma conta ou cartão."); return; }

    setBusy(true);
    try {
      const base = {
        type: form.type, value: round2(value), date: form.date,
        category_id: form.categoryId, subcategory: form.subcategory,
        account_id: form.accountId, payment_method: form.paymentMethod,
        installment: form.installment, installment_total: form.installmentsCount,
        recurrence: form.installment ? "nenhuma" : form.recurrence,
        note: form.note, source: "manual",
      };

      if (editingId) {
        await updateTransaction(supabase, editingId, base);
        showToast("Lançamento atualizado.");
      } else {
        const account = accounts.find((a) => a.id === form.accountId);
        const created = await createTransaction(supabase, householdId, base, account);
        showToast(created.length > 1 ? `${created.length} lançamentos criados.` : "Lançamento criado.");
      }
      await reloadTransactions(householdId, monthCursor);
      setForm({ ...emptyForm(), accountId: form.accountId });
      setEditingId(null);
      setShowManualForm(false);
    } catch (err) {
      showToast("Não consegui salvar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(tx) {
    setForm({
      type: tx.type, value: String(tx.value), date: tx.date, categoryId: tx.category_id,
      subcategory: tx.subcategory, accountId: tx.account_id, paymentMethod: tx.payment_method || "Débito",
      installment: false, installmentsCount: 2, recurrence: "nenhuma", note: tx.note || "",
    });
    setEditingId(tx.id);
    setShowManualForm(true);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filteredTransactions.length ? new Set() : new Set(filteredTransactions.map((t) => t.id))
    );
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedTotal = useMemo(() => {
    let receitas = 0, despesas = 0;
    for (const t of filteredTransactions) {
      if (!selectedIds.has(t.id)) continue;
      if (t.type === "receita") receitas += Number(t.value); else despesas += Number(t.value);
    }
    return { receitas: round2(receitas), despesas: round2(despesas) };
  }, [filteredTransactions, selectedIds]);

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await deleteTransactionsByIds(supabase, Array.from(selectedIds));
      showToast(`${selectedIds.size} lançamento(s) excluído(s).`);
      clearSelection();
      setShowBulkDeleteConfirm(false);
      await reloadTransactions(householdId, monthCursor);
    } catch {
      showToast("Não consegui excluir os lançamentos selecionados.");
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(tx) {
    if (tx.group_id) {
      const wantsGroup = window.confirm(
        `Esse lançamento faz parte de um grupo (${tx.group_type === "parcelamento" ? "parcelamento" : "recorrência"}).\n\nOK = excluir o grupo inteiro\nCancelar = excluir só esta ocorrência (confirme de novo)`
      );
      if (wantsGroup) {
        await deleteTransactionGroup(supabase, tx.group_id);
        await reloadTransactions(householdId, monthCursor);
        showToast("Grupo excluído.");
        return;
      }
      const wantsOne = window.confirm("Excluir só esta ocorrência?");
      if (!wantsOne) return;
    } else {
      if (!window.confirm("Excluir este lançamento?")) return;
    }
    await deleteTransaction(supabase, tx.id);
    await reloadTransactions(householdId, monthCursor);
    showToast("Lançamento excluído.");
  }

  async function updateCategoryInline(tx, categoryId, subcategory) {
    const patch = { category_id: categoryId, subcategory };
    if (tx.needs_review) patch.needs_review = false; // ao revisar a categoria, considera confirmado
    await updateTransaction(supabase, tx.id, patch);
    await reloadTransactions(householdId, monthCursor);
    setEditingCategoryRowId(null);
  }

  function handleNlpParse() {
    if (!nlpText.trim()) return;
    const parsed = parseNaturalLanguage(nlpText, accounts.map((a) => ({ id: a.id, name: a.name })));
    setNlpPreview(parsed);
  }

  async function confirmNlp() {
    const parsedValue = parseBRNumber(nlpPreview?.value);
    if (!nlpPreview || !parsedValue || isNaN(parsedValue) || parsedValue <= 0) {
      showToast("Não consegui identificar o valor. Ajuste antes de confirmar.");
      return;
    }
    setBusy(true);
    try {
      const base = {
        type: nlpPreview.type, value: round2(parsedValue), date: nlpPreview.date,
        category_id: nlpPreview.categoryId, subcategory: nlpPreview.subcategory,
        account_id: nlpPreview.accountId, payment_method: "Débito",
        installment: false, recurrence: "nenhuma", note: nlpPreview.note, source: "nlp",
      };
      await createTransaction(supabase, householdId, base, null);
      await reloadTransactions(householdId, monthCursor);
      setNlpText("");
      setNlpPreview(null);
      showToast("Lançamento criado a partir do texto.");
    } catch {
      showToast("Não consegui salvar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando seus lançamentos…</p>;
  }

  if (!householdId) {
    return <p className="text-sm" style={{ color: "var(--rose)" }}>Não encontrei sua família. Tente recarregar a página.</p>;
  }

  return (
    <div className="space-y-6">
      {accounts.length === 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "white" }}>
          <p className="text-sm font-medium mb-2">Cadastre sua primeira conta</p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
            Antes de lançar algo, você precisa de pelo menos uma conta (pode ser "Dinheiro" mesmo).
            A tela completa de Contas &amp; Cartões vem numa próxima fase — por enquanto, cadastre rapidinho aqui.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Nome (ex: Dinheiro, Nubank)"
              className="flex-1 text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
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
      )}

      {/* Navegador de mês (esconde quando um período personalizado está ativo) */}
      {customRangeTx === null ? (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-full hover:bg-slate-200/60"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium tabular w-40 text-center">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-full hover:bg-slate-200/60"><ChevronRight size={18} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span style={{ color: "var(--ink-soft)" }}>Período: {formatDatePt(filterFrom)} até {formatDatePt(filterTo)}</span>
          <button onClick={clearAllFilters} className="text-xs underline" style={{ color: "var(--brick)" }}>voltar pro mês</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="text-sm px-3.5 py-2 rounded-lg border bg-white flex items-center gap-1.5"
          style={{ borderColor: filtersActive ? "var(--brick)" : "var(--border)", color: filtersActive ? "var(--brick)" : "var(--ink)" }}
        >
          <SlidersHorizontal size={14} /> Filtros {filtersActive && "· ativos"}
        </button>
        <button
          onClick={handleExportCSV}
          className="text-sm px-3.5 py-2 rounded-lg border bg-white flex items-center gap-1.5"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Conta / cartão">
              <select value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <option value="">Todas</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <option value="">Todas</option>
                {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <option value="">Todos</option>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <Field label="Período — de">
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="até">
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <button onClick={applyCustomRange} disabled={rangeLoading} className="text-sm px-3 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
              {rangeLoading ? "Buscando…" : "Buscar período"}
            </button>
            <button onClick={clearAllFilters} className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              Limpar filtros
            </button>
          </div>

          {filtersActive && (
            <p className="text-xs pt-1 border-t" style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}>
              Os cards acima (Receitas, Despesas, Saldo, Lançamentos) refletem só o que está filtrado aqui.
            </p>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp size={15} />} label="Receitas" value={formatBRL(totals.receitas)} color="var(--teal)" />
        <KpiCard icon={<TrendingDown size={15} />} label="Despesas" value={formatBRL(totals.despesas)} color="var(--rose)" />
        <KpiCard icon={<Scale size={15} />} label="Saldo do mês" value={formatBRL(totals.saldo)} color={totals.saldo >= 0 ? "var(--teal)" : "var(--rose)"} />
        <KpiCard icon={<Receipt size={15} />} label="Lançamentos" value={String(totals.count)} color="var(--ink)" />
      </div>
      {!filtersActive && (
        <p className="text-xs -mt-3" style={{ color: "var(--ink-soft)" }}>
          Compras no cartão contam em Despesas/Saldo no mês em que a fatura vence, não no mês da compra — por isso a lista abaixo pode ter linhas marcadas com "→ fatura de…" que não entram nesses totais.
        </p>
      )}

      {/* Linguagem natural */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Wand2 size={16} style={{ color: "var(--brick)" }} />
          <h2 className="font-serif text-lg">Lance por escrito</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
          Ex.: "Gastei R$ 42,90 no iFood hoje no Nubank" — eu identifico valor, data, categoria e conta.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={nlpText}
            onChange={(e) => { setNlpText(e.target.value); setNlpPreview(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleNlpParse()}
            placeholder="Descreva o lançamento…"
            className="flex-1 text-sm px-3.5 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
          <button onClick={handleNlpParse} className="text-sm px-4 py-2.5 rounded-lg text-white flex items-center gap-1.5 justify-center" style={{ background: "var(--brick)" }}>
            <Wand2 size={14} /> Interpretar
          </button>
        </div>

        {nlpPreview && (
          <div className="mt-3 rounded-lg bg-white p-4" style={{ border: "1px dashed var(--border)" }}>
            <p className="text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: "var(--ink-soft)" }}>Prévia do lançamento</p>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm font-mono tabular">
              <span style={{ color: "var(--ink-soft)" }}>Tipo</span>
              <select value={nlpPreview.type} onChange={(e) => setNlpPreview({ ...nlpPreview, type: e.target.value })} className="text-right bg-transparent">
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>

              <span style={{ color: "var(--ink-soft)" }}>Valor</span>
              <input
                value={nlpPreview.value ?? ""}
                onChange={(e) => setNlpPreview({ ...nlpPreview, value: e.target.value, valueFound: true })}
                type="text" inputMode="decimal"
                className={`text-right bg-transparent outline-none ${!nlpPreview.valueFound ? "text-rose-600" : ""}`}
                placeholder="ex: 42,90"
              />

              <span style={{ color: "var(--ink-soft)" }}>Data</span>
              <input type="date" value={nlpPreview.date} onChange={(e) => setNlpPreview({ ...nlpPreview, date: e.target.value })} className="text-right bg-transparent" />

              <span style={{ color: "var(--ink-soft)" }}>Categoria</span>
              <select
                value={nlpPreview.categoryId}
                onChange={(e) => { const cat = categoryByIdIn(e.target.value, allCategories); setNlpPreview({ ...nlpPreview, categoryId: e.target.value, subcategory: cat.subcategories[0] }); }}
                className="text-right bg-transparent"
              >
                {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <span style={{ color: "var(--ink-soft)" }}>Subcategoria</span>
              <select value={nlpPreview.subcategory} onChange={(e) => setNlpPreview({ ...nlpPreview, subcategory: e.target.value })} className="text-right bg-transparent">
                {(categoryByIdIn(nlpPreview.categoryId, allCategories)?.subcategories || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <span style={{ color: "var(--ink-soft)" }}>Conta</span>
              <select value={nlpPreview.accountId || ""} onChange={(e) => setNlpPreview({ ...nlpPreview, accountId: e.target.value })} className="text-right bg-transparent">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNlpPreview(null)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
              <button disabled={busy} onClick={confirmNlp} className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1 disabled:opacity-60" style={{ background: "var(--teal)" }}>
                <Check size={13} /> Confirmar lançamento
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Botão do formulário manual */}
      <div>
        <button
          onClick={() => { setShowManualForm((s) => !s); setEditingId(null); setForm({ ...emptyForm(), accountId: accounts[0]?.id || "" }); }}
          className="text-sm px-3.5 py-2 rounded-lg border bg-white flex items-center gap-1.5"
          style={{ borderColor: "var(--border)" }}
        >
          <Plus size={14} /> {showManualForm ? "Fechar formulário" : "Lançamento manual"}
        </button>
      </div>

      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-2">
            {["despesa", "receita"].map((t) => (
              <button
                type="button" key={t}
                onClick={() => setForm((f) => ({ ...f, type: t, categoryId: t === "receita" ? "renda" : "alimentacao", subcategory: t === "receita" ? "Salário" : "Mercado" }))}
                className="flex-1 text-sm py-2 rounded-lg"
                style={form.type === t
                  ? { background: t === "receita" ? "var(--teal)" : "var(--rose)", color: "white", border: "1px solid transparent" }
                  : { border: "1px solid var(--border)" }}
              >
                {t === "despesa" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input required type="text" inputMode="decimal" placeholder="0,00" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>
            <Field label="Data">
              <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </Field>

            <Field label="Categoria">
              <select
                value={form.categoryId}
                onChange={(e) => { const cat = categoryByIdIn(e.target.value, allCategories); setForm((f) => ({ ...f, categoryId: e.target.value, subcategory: cat.subcategories[0] })); }}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
              >
                {allCategories.filter((c) => (form.type === "receita" ? c.group === "receita" : c.group !== "receita")).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Subcategoria">
              <select value={form.subcategory} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                {currentCategory.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Conta / cartão">
              <select required value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <option value="" disabled>Selecione</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Forma de pagamento">
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          {!editingId && (
            <div className="grid grid-cols-2 gap-3 items-end">
              <Field label="Parcelado?">
                <div className="flex items-center gap-2 h-[38px]">
                  <input type="checkbox" checked={form.installment} onChange={(e) => setForm((f) => ({ ...f, installment: e.target.checked }))} />
                  <span className="text-sm" style={{ color: "var(--ink-soft)" }}>Compra parcelada</span>
                </div>
              </Field>
              {form.installment ? (
                <Field label="Número de parcelas">
                  <input type="number" min="2" max="48" value={form.installmentsCount} onChange={(e) => setForm((f) => ({ ...f, installmentsCount: parseInt(e.target.value, 10) || 2 }))}
                    className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
                </Field>
              ) : (
                <Field label="Recorrência">
                  <select value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    {RECURRENCE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </Field>
              )}
            </div>
          )}

          <Field label="Observação">
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="opcional"
              className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setShowManualForm(false); setEditingId(null); }} className="text-sm px-3.5 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
              {editingId ? "Salvar alterações" : "Adicionar lançamento"}
            </button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <section>
        <h2 className="font-serif text-lg mb-3">
          {filtersActive ? "Lançamentos filtrados" : `Lançamentos de ${monthLabel.toLowerCase()}`}
        </h2>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 mb-2" style={{ background: "#fdf1ed" }}>
            <span className="text-xs" style={{ color: "var(--brick)" }}>{selectedIds.size} selecionado(s)</span>
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="text-xs underline" style={{ color: "var(--ink-soft)" }}>Cancelar seleção</button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--rose)" }}
              >
                <Trash2 size={12} /> Excluir selecionados
              </button>
            </div>
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <div className="text-sm rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}>
            {filtersActive ? "Nenhum lançamento encontrado com esses filtros." : "Nenhum lançamento neste mês ainda."}
          </div>
        ) : (
          <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--ink-soft)", background: "var(--paper)" }}>
                  <th className="pl-4 pr-2 py-2.5 font-medium w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                      onChange={toggleSelectAll}
                      title="Selecionar todos"
                    />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Categoria</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Conta</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Obs.</th>
                  <th className="px-4 py-2.5 font-medium text-right">Valor</th>
                  <th className="px-4 py-2.5 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const cat = categoryByIdIn(t.category_id, allCategories);
                  const isEditingCat = editingCategoryRowId === t.id;
                  const effMonth = getEffectiveMonth(t, accountsMap);
                  const shifted = effMonth !== t.date.slice(0, 7);
                  return (
                    <tr key={t.id} className="border-t" style={{ borderColor: "var(--border)", background: selectedIds.has(t.id) ? "#fdf1ed" : "transparent" }}>
                      <td className="pl-4 pr-2 py-2.5">
                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                      </td>
                      <td className="px-4 py-2.5 tabular whitespace-nowrap">{formatDatePt(t.date)}</td>
                      <td className="px-4 py-2.5">
                        {isEditingCat ? (
                          <div className="flex gap-1">
                            <select
                              value={t.category_id}
                              onChange={(e) => { const c = categoryByIdIn(e.target.value, allCategories); updateCategoryInline(t, e.target.value, c.subcategories[0]); }}
                              className="text-xs px-1.5 py-1 rounded border" style={{ borderColor: "var(--border)" }}
                            >
                              {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={() => setEditingCategoryRowId(null)} className="text-slate-400"><X size={13} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingCategoryRowId(t.id)} className="flex items-center gap-1 text-left hover:opacity-70">
                            <span>{cat?.name}</span>
                            <span style={{ color: "var(--ink-soft)" }} className="text-xs">· {t.subcategory}</span>
                            <Pencil size={11} className="opacity-40" />
                          </button>
                        )}
                        {t.installment_current && (
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>parcela {t.installment_current}/{t.installment_total}</div>
                        )}
                        {shifted && (
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--brick)" }}>→ fatura de {formatBucketLabel(effMonth).toLowerCase()}</div>
                        )}
                        {t.needs_review && (
                          <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "var(--amber)" }}>
                            <RefreshCw size={9} /> Confirme a categoria
                          </div>
                        )}
                        {t.possible_duplicate_of && (
                          <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "var(--rose)" }}>
                            <AlertTriangle size={9} /> Pode ser duplicata
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">{accountName(t.account_id)}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell max-w-[160px] truncate" style={{ color: "var(--ink-soft)" }}>{t.note || "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular font-mono" style={{ color: t.type === "receita" ? "var(--teal)" : "var(--rose)" }}>
                        {t.type === "receita" ? "+" : "-"}{formatBRL(Number(t.value))}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-slate-700"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(t)} className="text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,32,46,0.5)" }}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <p className="text-sm font-medium flex items-center gap-1.5 mb-3" style={{ color: "var(--rose)" }}>
              <AlertTriangle size={16} /> Confirmar exclusão
            </p>
            <p className="text-sm mb-1" style={{ color: "var(--ink)" }}>
              Isso vai apagar {selectedIds.size} lançamento(s) selecionado(s):
            </p>
            <p className="text-xs mb-1" style={{ color: "var(--teal)" }}>Receitas: {formatBRL(selectedTotal.receitas)}</p>
            <p className="text-xs mb-3" style={{ color: "var(--rose)" }}>Despesas: {formatBRL(selectedTotal.despesas)}</p>
            <p className="text-xs mb-4" style={{ color: "var(--ink-soft)" }}>Essa ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex-1 text-sm px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: "var(--rose)" }}
              >
                {bulkDeleting ? "Excluindo…" : "Sim, excluir"}
              </button>
            </div>
          </div>
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

function KpiCard({ icon, label, value, color }) {
  return (
    <div className="rounded-xl border bg-white p-3.5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide mb-1.5" style={{ color: "var(--ink-soft)" }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div className="font-mono tabular text-base sm:text-lg font-medium" style={{ color }}>{value}</div>
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
