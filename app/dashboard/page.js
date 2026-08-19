"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, Scale, CreditCard, PiggyBank, ChevronLeft, ChevronRight, Home, Gauge, Plus, Trash2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts } from "@/lib/data/accounts";
import { listAllTransactions } from "@/lib/data/transactions";
import { listDebts } from "@/lib/data/debts";
import { getSettings, upsertSettings } from "@/lib/data/settings";
import { listCustomCategories } from "@/lib/data/categories";
import { listSubscriptions, createSubscription, updateSubscription, deleteSubscription } from "@/lib/data/subscriptions";
import {
  MONTH_NAMES, formatBRL, formatDatePt, toISODate, round2, detectRecurringCharges,
  accountsToMap, getEffectiveMonth, computeAccountBalance, computeCardInvoices,
  computeMonthlySeries, computeCategoryBreakdown, computeCardInvoiceHistory,
  computeDebtsAggregate, computeDebtStatus, prevMonthCursor,
  computeBudgetGroups, GROUP_ORDER, GROUP_LABELS, parseBRNumber,
  computeGoalMetrics, computeGoalProjection, computePreparationIndex, formatBucketLabel,
  mergeCategories,
} from "@/lib/finance/core";

const DASH_VIEWS = [
  { id: "visao", label: "Visão Geral" },
  { id: "fluxo", label: "Fluxo de Caixa" },
  { id: "despesas", label: "Despesas" },
  { id: "orcamento", label: "Orçamento 50/30/20" },
  { id: "cartoes", label: "Cartões" },
  { id: "dividas", label: "Dívidas" },
  { id: "assinaturas", label: "Assinaturas" },
  { id: "imovel", label: "Primeiro Imóvel" },
  { id: "patrimonio", label: "Patrimônio" },
];

const CHART_PALETTE = ["#14202e", "#a8432a", "#1f6f5c", "#b8791a", "#5b6572", "#7c9885", "#c9a66b", "#8a5a44", "#4a6fa5", "#9b6b9e"];
const C_INK = "#14202e", C_TEAL = "#1f6f5c", C_ROSE = "#b23b3b", C_BRICK = "#a8432a", C_BORDER = "#e2e6ea", C_SOFT = "#5b6572", C_MUTEDBAR = "#c7ccd3";
const GROUP_COLORS = { necessidades: C_INK, desejos: C_BRICK, futuro: C_TEAL };

export default function DashboardPage() {
  const supabase = createClient();
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subToast, setSubToast] = useState("");
  const searchParams = useSearchParams();
  const [dashView, setDashView] = useState(() => searchParams.get("view") || "visao");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  function showSubToast(msg) {
    setSubToast(msg);
    setTimeout(() => setSubToast(""), 2500);
  }

  async function reloadSubscriptions(hid) {
    setSubscriptions(await listSubscriptions(supabase, hid));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hid = await getMyHouseholdId(supabase);
      setHouseholdId(hid);
      if (hid) {
        const [accs, txs, dbts, sett, customCats, subs] = await Promise.all([
          listAccounts(supabase, hid),
          listAllTransactions(supabase, hid),
          listDebts(supabase, hid),
          getSettings(supabase, hid),
          listCustomCategories(supabase, hid),
          listSubscriptions(supabase, hid),
        ]);
        setAccounts(accs);
        setTransactions(txs);
        setDebts(dbts);
        setSettings(sett);
        setCustomCategories(customCats);
        setSubscriptions(subs);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function shiftMonth(delta) {
    const [y, m] = monthCursor.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [newSubName, setNewSubName] = useState("");
  const [newSubValor, setNewSubValor] = useState("");
  const [newSubDia, setNewSubDia] = useState("");
  const [newSubAccountId, setNewSubAccountId] = useState("");
  const [savingSub, setSavingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);

  async function handleAddSubscription(e) {
    e.preventDefault();
    if (!newSubName.trim() || !newSubValor) { showSubToast("Preencha nome e valor."); return; }
    setSavingSub(true);
    try {
      const fields = {
        name: newSubName.trim(),
        valor: parseBRNumber(newSubValor),
        dia_cobranca: newSubDia ? Number(newSubDia) : null,
        account_id: newSubAccountId || null,
        ativa: true,
      };
      const created = await createSubscription(supabase, householdId, fields);
      setSubscriptions((prev) => (prev.some((s) => s.id === created.id) ? prev : [...prev, created]));
      setNewSubName(""); setNewSubValor(""); setNewSubDia(""); setNewSubAccountId("");
      showSubToast("Assinatura adicionada.");
    } catch {
      showSubToast("Não consegui adicionar.");
    } finally {
      setSavingSub(false);
    }
  }

  async function handleToggleActiveSub(sub) {
    const updated = await updateSubscription(supabase, sub.id, { ativa: !sub.ativa });
    setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
  }

  async function handleDeleteSubscription(sub) {
    if (!window.confirm(`Remover "${sub.name}" da lista de assinaturas?`)) return;
    await deleteSubscription(supabase, sub.id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
    showSubToast("Removida.");
  }

  function handleAddFromSuggestion(r) {
    setNewSubName(r.descricao);
    setNewSubValor(String(r.valorAtual).replace(".", ","));
    setNewSubAccountId(r.accountId || "");
    setDashView("assinaturas"); // garante que a pessoa vê o formulário já preenchido
  }

  const monthLabel = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} de ${y}`;
  }, [monthCursor]);

  const accountsMap = useMemo(() => accountsToMap(accounts), [accounts]);
  const recorrentes = useMemo(() => detectRecurringCharges(transactions), [transactions]);
  const totalAssinaturasManual = useMemo(
    () => round2(subscriptions.filter((s) => s.ativa).reduce((s, sub) => s + Number(sub.valor), 0)),
    [subscriptions]
  );
  const sugestoesNaoAdicionadas = useMemo(() => {
    const nomesJaAdicionados = new Set(subscriptions.map((s) => s.name.trim().toUpperCase()));
    return recorrentes.filter((r) => !nomesJaAdicionados.has(r.descricao.trim().toUpperCase()));
  }, [recorrentes, subscriptions]);
  const allCategories = useMemo(() => mergeCategories(customCategories), [customCategories]);
  const cards = useMemo(() => accounts.filter((a) => a.type === "cartao"), [accounts]);

  function computeTotalsFor(month) {
    let receitas = 0, despesas = 0, count = 0;
    for (const t of transactions) {
      if (getEffectiveMonth(t, accountsMap) !== month) continue;
      count += 1;
      if (t.type === "receita") receitas += Number(t.value); else despesas += Number(t.value);
    }
    return { receitas: round2(receitas), despesas: round2(despesas), saldo: round2(receitas - despesas), count };
  }

  const totals = useMemo(() => computeTotalsFor(monthCursor), [transactions, accountsMap, monthCursor]);
  const prevTotals = useMemo(() => computeTotalsFor(prevMonthCursor(monthCursor)), [transactions, accountsMap, monthCursor]);

  const saldoTotalContas = useMemo(
    () => round2(accounts.filter((a) => a.type === "conta").reduce((sum, a) => sum + computeAccountBalance(a, transactions, today), 0)),
    [accounts, transactions, today]
  );
  const faturaTotalAberta = useMemo(
    () => round2(cards.reduce((sum, c) => sum + computeCardInvoices(c, transactions, today).currentTotal, 0)),
    [cards, transactions, today]
  );
  const debtsAggregate = useMemo(() => computeDebtsAggregate(debts, today), [debts, today]);
  const dividaTotalRestante = debtsAggregate.totalRestante;
  const comprometidoMes = useMemo(() => round2(faturaTotalAberta + debtsAggregate.parcelaMensalAtiva), [faturaTotalAberta, debtsAggregate]);
  const podeGastar = useMemo(() => round2(saldoTotalContas - comprometidoMes), [saldoTotalContas, comprometidoMes]);
  const taxaEconomia = useMemo(() => (totals.receitas > 0 ? round2((totals.saldo / totals.receitas) * 100) : 0), [totals]);
  const patrimonioLiquido = useMemo(() => round2(saldoTotalContas - dividaTotalRestante - faturaTotalAberta), [saldoTotalContas, dividaTotalRestante, faturaTotalAberta]);

  const monthlySeries = useMemo(() => computeMonthlySeries(transactions, accountsMap, monthCursor, 6), [transactions, accountsMap, monthCursor]);
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(transactions, accountsMap, monthCursor, allCategories), [transactions, accountsMap, monthCursor, allCategories]);
  const categoryBreakdownPrev = useMemo(() => computeCategoryBreakdown(transactions, accountsMap, prevMonthCursor(monthCursor), allCategories), [transactions, accountsMap, monthCursor, allCategories]);

  const budgetGroups = useMemo(
    () => (settings ? computeBudgetGroups(transactions, accountsMap, monthCursor, totals.receitas, settings, allCategories) : []),
    [transactions, accountsMap, monthCursor, totals.receitas, settings, allCategories]
  );
  const budgetPctSum = useMemo(() => {
    if (!settings) return 0;
    return GROUP_ORDER.reduce((sum, g) => {
      const v = parseBRNumber(settings[`budget_${g}`]);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [settings]);

  async function updateBudgetPct(group, rawValue) {
    const next = { ...settings, [`budget_${group}`]: rawValue };
    setSettings(next);
    try {
      await upsertSettings(supabase, householdId, { [`budget_${group}`]: rawValue });
    } catch {
      // mantém o valor local mesmo se a gravação falhar momentaneamente
    }
  }

  async function restoreDefaultBudget() {
    const next = { ...settings, budget_necessidades: 50, budget_desejos: 30, budget_futuro: 20 };
    setSettings(next);
    await upsertSettings(supabase, householdId, { budget_necessidades: 50, budget_desejos: 30, budget_futuro: 20 });
  }

  const goalMetrics = useMemo(() => (settings ? computeGoalMetrics(settings, transactions, today) : null), [settings, transactions, today]);
  const goalProjection = useMemo(() => (settings ? computeGoalProjection(settings, transactions, today, 12) : []), [settings, transactions, today]);

  const receitaMedia6m = useMemo(() => {
    const comReceita = monthlySeries.filter((m) => m.receitas > 0);
    return comReceita.length ? round2(comReceita.reduce((s, m) => s + m.receitas, 0) / comReceita.length) : 0;
  }, [monthlySeries]);

  const despesaMedia6m = useMemo(() => round2(monthlySeries.reduce((s, m) => s + m.despesas, 0) / 6), [monthlySeries]);

  const preparationIndex = useMemo(() => {
    if (!goalMetrics) return null;
    return computePreparationIndex({
      progressoPct: goalMetrics.progressoPct, mediaMensal: goalMetrics.mediaMensal,
      receitaMedia: receitaMedia6m, comprometidoMes, saldoTotalContas, despesaMedia: despesaMedia6m,
    });
  }, [goalMetrics, receitaMedia6m, comprometidoMes, saldoTotalContas, despesaMedia6m]);

  async function updateGoalField(field, rawValue) {
    const next = { ...settings, [field]: rawValue };
    setSettings(next);
    try {
      await upsertSettings(supabase, householdId, { [field]: rawValue });
    } catch {
      // mantém o valor local mesmo se a gravação falhar momentaneamente
    }
  }

  function pctChange(curr, prev) {
    if (prev === 0) return curr === 0 ? 0 : null;
    return round2(((curr - prev) / Math.abs(prev)) * 100);
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando…</p>;
  if (!householdId) return <p className="text-sm" style={{ color: "var(--rose)" }}>Não encontrei sua família. Tente recarregar a página.</p>;

  return (
    <section className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DASH_VIEWS.map((v) => (
          <button
            key={v.id} onClick={() => setDashView(v.id)}
            className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0"
            style={dashView === v.id ? { background: "var(--brick)", color: "white", borderColor: "transparent" } : { borderColor: "var(--border)", color: "var(--ink-soft)" }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {dashView !== "assinaturas" && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-full hover:bg-slate-200/60"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium tabular w-40 text-center">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-full hover:bg-slate-200/60"><ChevronRight size={16} /></button>
        </div>
      )}

      {dashView === "visao" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard icon={<Wallet size={15} />} label="Quanto tenho" value={formatBRL(saldoTotalContas)} color={saldoTotalContas >= 0 ? "var(--ink)" : "var(--rose)"} />
            <KpiCardDelta icon={<TrendingUp size={15} />} label="Entrou" value={formatBRL(totals.receitas)} color="var(--teal)" delta={pctChange(totals.receitas, prevTotals.receitas)} />
            <KpiCardDelta icon={<TrendingDown size={15} />} label="Saiu" value={formatBRL(totals.despesas)} color="var(--rose)" delta={pctChange(totals.despesas, prevTotals.despesas)} invertDelta />
            <KpiCard icon={<CreditCard size={15} />} label="Comprometido" value={formatBRL(comprometidoMes)} color="var(--amber)" />
            <KpiCard icon={<Scale size={15} />} label="Posso gastar" value={formatBRL(podeGastar)} color={podeGastar >= 0 ? "var(--teal)" : "var(--rose)"} />
            <KpiCard icon={<PiggyBank size={15} />} label="Economizando" value={`${taxaEconomia}%`} color={taxaEconomia >= 0 ? "var(--teal)" : "var(--rose)"} />
          </div>

          <ChartCard title="Receitas x despesas — últimos 6 meses">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C_SOFT }} axisLine={{ stroke: C_BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                <Bar dataKey="receitas" name="Receitas" fill={C_TEAL} radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill={C_ROSE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={`Despesas por categoria — ${monthLabel.toLowerCase()}`}>
            <CategoryDonutWithList rows={categoryBreakdown.rows} />
          </ChartCard>
        </>
      )}

      {dashView === "fluxo" && (
        <>
          <ChartCard title="Evolução do saldo mensal">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C_SOFT }} axisLine={{ stroke: C_BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                <Area type="monotone" dataKey="saldo" name="Saldo" stroke={C_INK} fill={C_INK} fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={`${monthLabel} x mês anterior`}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Receitas</p>
                <p className="font-mono tabular font-medium" style={{ color: "var(--teal)" }}>{formatBRL(totals.receitas)}</p>
                <DeltaBadge value={pctChange(totals.receitas, prevTotals.receitas)} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Despesas</p>
                <p className="font-mono tabular font-medium" style={{ color: "var(--rose)" }}>{formatBRL(totals.despesas)}</p>
                <DeltaBadge value={pctChange(totals.despesas, prevTotals.despesas)} invert />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Saldo</p>
                <p className="font-mono tabular font-medium">{formatBRL(totals.saldo)}</p>
                <DeltaBadge value={pctChange(totals.saldo, prevTotals.saldo)} />
              </div>
            </div>
          </ChartCard>
        </>
      )}

      {dashView === "despesas" && (
        <>
          <ChartCard title={`Distribuição por categoria — ${monthLabel.toLowerCase()}`}>
            <CategoryDonutWithList rows={categoryBreakdown.rows} big />
          </ChartCard>
          <ChartCard title="Comparativo por categoria — este mês x mês anterior">
            <CategoryComparisonChart current={categoryBreakdown.rows} previous={categoryBreakdownPrev.rows} categories={allCategories} />
          </ChartCard>
        </>
      )}

      {dashView === "orcamento" && settings && (
        <>
          <ChartCard
            title="Percentuais do orçamento"
            right={<button onClick={restoreDefaultBudget} className="text-xs hover:underline" style={{ color: "var(--ink-soft)" }}>Restaurar 50/30/20</button>}
          >
            <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
              O planejado de cada grupo é sempre uma % da sua receita real do mês — ajusta sozinho quando sua renda muda.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {GROUP_ORDER.map((g) => (
                <label key={g} className="block">
                  <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>{GROUP_LABELS[g]} (%)</span>
                  <input
                    type="text" inputMode="decimal"
                    value={settings[`budget_${g}`] ?? ""}
                    onChange={(e) => updateBudgetPct(g, e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
                  />
                </label>
              ))}
            </div>
            {Math.round(budgetPctSum) !== 100 && (
              <p className="text-xs mt-2" style={{ color: "var(--amber)" }}>Os percentuais somam {round2(budgetPctSum)}% — não precisa fechar 100%, mas vale conferir.</p>
            )}
          </ChartCard>

          {totals.receitas === 0 && (
            <div className="text-xs rounded-lg px-3 py-2" style={{ background: "#fdf1ef", color: "var(--rose)" }}>
              Sem receita lançada em {monthLabel.toLowerCase()} — o valor planejado fica zerado até você lançar uma receita do mês.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {budgetGroups.map((bg) => (
              <div key={bg.group} className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{GROUP_LABELS[bg.group]}</p>
                  <span className="text-xs font-mono" style={{ color: bg.usoPct > 100 ? "var(--rose)" : "var(--ink-soft)" }}>{bg.usoPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, bg.usoPct)}%`, background: bg.usoPct > 100 ? "var(--rose)" : GROUP_COLORS[bg.group] }} />
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--ink-soft)" }}>Gasto</span>
                  <span className="font-mono tabular">{formatBRL(bg.gasto)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--ink-soft)" }}>Planejado</span>
                  <span className="font-mono tabular">{formatBRL(bg.planejado)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 mt-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--ink-soft)" }}>{bg.saldo >= 0 ? "Ainda cabe" : "Estourou em"}</span>
                  <span className="font-mono tabular font-medium" style={{ color: bg.saldo >= 0 ? "var(--teal)" : "var(--rose)" }}>{formatBRL(Math.abs(bg.saldo))}</span>
                </div>
              </div>
            ))}
          </div>

          <ChartCard title="Planejado x gasto por grupo">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetGroups.map((bg) => ({ name: GROUP_LABELS[bg.group], planejado: bg.planejado, gasto: bg.gasto }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: C_SOFT }} axisLine={{ stroke: C_BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="planejado" name="Planejado" fill={C_MUTEDBAR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="gasto" name="Gasto" fill={C_BRICK} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {dashView === "cartoes" && (
        cards.length === 0 ? (
          <EmptyDashState text='Nenhum cartão cadastrado ainda. Adicione um na aba "Contas & Cartões".' />
        ) : (
          <div className="space-y-4">
            {cards.map((c) => {
              const history = computeCardInvoiceHistory(c, transactions, monthCursor, 6);
              const inv = computeCardInvoices(c, transactions, today);
              const limite = Number(c.limite) || 0;
              const pct = limite > 0 ? Math.min(100, Math.round((inv.currentTotal / limite) * 100)) : 0;
              return (
                <ChartCard key={c.id} title={c.name} right={<span className="text-xs font-mono" style={{ color: pct > 85 ? "var(--rose)" : "var(--ink-soft)" }}>{pct}% do limite usado</span>}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: C_SOFT }} axisLine={{ stroke: C_BORDER }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                      <Bar dataKey="total" name="Fatura" fill={C_BRICK} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              );
            })}
          </div>
        )
      )}

      {dashView === "dividas" && (
        debts.length === 0 ? (
          <EmptyDashState text="Nenhuma dívida cadastrada ainda." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard icon={<PiggyBank size={15} />} label="Total restante" value={formatBRL(debtsAggregate.totalRestante)} color="var(--rose)" />
              <KpiCard icon={<Scale size={15} />} label="Compromisso mensal" value={formatBRL(debtsAggregate.parcelaMensalAtiva)} color="var(--amber)" />
            </div>
            <ChartCard title="Pago x restante (todas as dívidas)">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[{ name: "Pago", value: debtsAggregate.totalPago }, { name: "Restante", value: debtsAggregate.totalRestante }]}
                    dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    <Cell fill={C_TEAL} />
                    <Cell fill={C_ROSE} />
                  </Pie>
                  <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Maiores dívidas em aberto">
              <ResponsiveContainer width="100%" height={Math.max(160, debts.length * 44)}>
                <BarChart data={debts.map((d) => ({ name: d.nome, restante: computeDebtStatus(d, today).valorRestante })).sort((a, b) => b.restante - a.restante)} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C_INK }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                  <Bar dataKey="restante" name="Restante" fill={C_ROSE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )
      )}

      {dashView === "assinaturas" && (
        <>
          <p className="text-xs -mt-2" style={{ color: "var(--ink-soft)" }}>
            Você controla o que entra aqui — nada é adicionado sozinho.
          </p>

          <KpiCard icon={<Wallet size={15} />} label="Total mensal em assinaturas ativas" value={formatBRL(totalAssinaturasManual)} color="var(--brick)" />

          {subscriptions.length > 0 && (
            <div className="space-y-2">
              {subscriptions.map((s) => (
                <div key={s.id} className="rounded-xl border bg-white p-4 flex items-center justify-between gap-3" style={{ borderColor: "var(--border)", opacity: s.ativa ? 1 : 0.5 }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
                      {accountsMap[s.account_id]?.name || "Sem conta definida"}{s.dia_cobranca ? ` · cobra por volta do dia ${s.dia_cobranca}` : ""}{!s.ativa ? " · pausada" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono tabular text-sm font-medium" style={{ color: "var(--ink)" }}>{formatBRL(s.valor)}/mês</span>
                    <button onClick={() => handleToggleActiveSub(s)} className="text-xs underline" style={{ color: "var(--ink-soft)" }}>
                      {s.ativa ? "pausar" : "reativar"}
                    </button>
                    <button onClick={() => handleDeleteSubscription(s)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddSubscription} className="rounded-xl border bg-white p-4 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Adicionar assinatura</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newSubName} onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Nome (ex: Netflix)" className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
              />
              <input
                value={newSubValor} onChange={(e) => setNewSubValor(e.target.value)}
                placeholder="Valor mensal (R$)" className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newSubDia} onChange={(e) => setNewSubDia(e.target.value)} type="number" min="1" max="31"
                placeholder="Dia da cobrança (opcional)" className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
              />
              <select value={newSubAccountId} onChange={(e) => setNewSubAccountId(e.target.value)} className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <option value="">Sem conta definida</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={savingSub} className="text-sm px-3.5 py-2 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: "var(--ink)" }}>
              <Plus size={13} /> {savingSub ? "Adicionando…" : "Adicionar"}
            </button>
          </form>

          {recorrentes.length > 0 && sugestoesNaoAdicionadas.length > 0 && (
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--ink-soft)" }}>Sugestões, baseadas em padrão de cobrança no seu histórico — clique pra adicionar à sua lista, se fizer sentido:</p>
              <div className="space-y-1.5">
                {sugestoesNaoAdicionadas.map((r) => (
                  <button
                    key={r.chave} onClick={() => handleAddFromSuggestion(r)}
                    className="w-full flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg border bg-white text-left hover:bg-slate-50"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span>{r.descricao} <span style={{ color: "var(--ink-soft)" }}>({r.ocorrencias}x detectado{r.ocorrencias > 1 ? "as" : ""})</span></span>
                    <span className="flex items-center gap-1 shrink-0"><Plus size={11} /> {formatBRL(r.valorAtual)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {subToast && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50" style={{ background: "var(--ink)" }}>
              {subToast}
            </div>
          )}
        </>
      )}

      {dashView === "imovel" && goalMetrics && (
        <>
          <ChartCard title="Configurar a meta">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block">
                <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Valor do imóvel (R$)</span>
                <input type="text" inputMode="decimal" value={settings.goal_valor_imovel ?? ""} onChange={(e) => updateGoalField("goal_valor_imovel", e.target.value)}
                  placeholder="ex: 400.000" className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
              </label>
              <label className="block">
                <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Entrada (%)</span>
                <input type="text" inputMode="decimal" value={settings.goal_pct_entrada ?? ""} onChange={(e) => updateGoalField("goal_pct_entrada", e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
              </label>
              <label className="block">
                <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Prazo desejado (meses)</span>
                <input type="number" min="1" value={settings.goal_prazo_meses ?? ""} onChange={(e) => updateGoalField("goal_prazo_meses", e.target.value)}
                  placeholder="opcional" className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
              </label>
              <label className="block">
                <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Já tinha guardado (R$)</span>
                <input type="text" inputMode="decimal" value={settings.goal_valor_inicial ?? ""} onChange={(e) => updateGoalField("goal_valor_inicial", e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
              </label>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--ink-soft)" }}>
              Pra contar como aporte, lance uma despesa em <strong>Futuro › Fundo do imóvel</strong> na aba Lançamentos.
            </p>
          </ChartCard>

          {goalMetrics.valorImovel > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChartCard title="Índice de preparação">
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-mono font-medium shrink-0"
                      style={{ background: prepTint(preparationIndex.total), color: prepColor(preparationIndex.total) }}
                    >
                      {preparationIndex.total}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: prepColor(preparationIndex.total) }}>{preparationIndex.label}</p>
                      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>de 0 a 100</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {preparationIndex.componentes.map((c) => (
                      <div key={c.key}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span style={{ color: "var(--ink-soft)" }}>{c.label} <span className="opacity-60">({c.peso}%)</span></span>
                          <span className="font-mono tabular">{c.score}</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: prepColor(c.score) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                <ChartCard title="Progresso da entrada">
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
                    <div className="h-full rounded-full" style={{ width: `${goalMetrics.progressoPct}%`, background: "var(--teal)" }} />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span style={{ color: "var(--ink-soft)" }}>Entrada necessária</span><span className="font-mono tabular">{formatBRL(goalMetrics.valorEntrada)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--ink-soft)" }}>Já guardado</span><span className="font-mono tabular" style={{ color: "var(--teal)" }}>{formatBRL(goalMetrics.acumulado)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--ink-soft)" }}>Falta</span><span className="font-mono tabular" style={{ color: "var(--rose)" }}>{formatBRL(goalMetrics.faltante)}</span></div>
                    <div className="flex justify-between pt-1.5 mt-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                      <span style={{ color: "var(--ink-soft)" }}>Média guardada / mês</span><span className="font-mono tabular">{formatBRL(goalMetrics.mediaMensal)}</span>
                    </div>
                    {goalMetrics.mesesParaAtingir !== null && (
                      <div className="flex justify-between"><span style={{ color: "var(--ink-soft)" }}>No ritmo atual</span>
                        <span className="font-mono tabular">
                          {goalMetrics.mesesParaAtingir === 0 ? "já atingiu!" : `${goalMetrics.mesesParaAtingir} meses (${formatDatePt(goalMetrics.dataEstimada)})`}
                        </span>
                      </div>
                    )}
                    {goalMetrics.prazoMeses && goalMetrics.prazoAtingivel === false && (
                      <p className="text-[11px] pt-1" style={{ color: "var(--rose)" }}>
                        No ritmo atual, o prazo de {goalMetrics.prazoMeses} meses que você definiu não vai ser alcançado — considere guardar mais por mês ou esticar o prazo.
                      </p>
                    )}
                  </div>
                </ChartCard>
              </div>

              <ChartCard title="Projeção — próximos 12 meses">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={goalProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: C_SOFT }} axisLine={{ stroke: C_BORDER }} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                    <ReferenceLine y={goalMetrics.valorEntrada} stroke={C_BRICK} strokeDasharray="4 4" label={{ value: "Meta", position: "insideTopRight", fontSize: 11, fill: C_BRICK }} />
                    <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke={C_TEAL} fill={C_TEAL} fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                {goalMetrics.mediaMensal === 0 && (
                  <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
                    Ainda não há aportes lançados nos últimos 6 meses — a projeção fica reta até você começar a guardar.
                  </p>
                )}
              </ChartCard>

              {comprometidoMes > 0 && receitaMedia6m > 0 && comprometidoMes / receitaMedia6m > 0.3 && (
                <div className="text-xs rounded-lg px-3 py-2.5" style={{ background: "#fdf1ef", color: "var(--rose)" }}>
                  Suas faturas e parcelas de dívidas já comprometem {Math.round((comprometidoMes / receitaMedia6m) * 100)}% da sua renda média —
                  isso reduz o quanto sobra pra guardar todo mês. Vale dar uma olhada na aba Dívidas.
                </div>
              )}
            </>
          )}
        </>
      )}

      {dashView === "patrimonio" && (
        <>
          <KpiCard icon={<Scale size={15} />} label="Patrimônio líquido" value={formatBRL(patrimonioLiquido)} color={patrimonioLiquido >= 0 ? "var(--teal)" : "var(--rose)"} />
          <ChartCard title="Você tem x você deve">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: "Você tem", valor: saldoTotalContas }, { name: "Você deve", valor: round2(dividaTotalRestante + faturaTotalAberta) }]}>
                <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: C_SOFT }} axisLine={{ stroke: C_BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  <Cell fill={C_TEAL} />
                  <Cell fill={C_ROSE} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--ink-soft)" }}>Saldo em contas</p>
              <p className="font-mono tabular font-medium mt-1">{formatBRL(saldoTotalContas)}</p>
            </div>
            <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--ink-soft)" }}>Faturas em aberto</p>
              <p className="font-mono tabular font-medium mt-1" style={{ color: "var(--rose)" }}>{formatBRL(faturaTotalAberta)}</p>
            </div>
            <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--ink-soft)" }}>Dívidas restantes</p>
              <p className="font-mono tabular font-medium mt-1" style={{ color: "var(--rose)" }}>{formatBRL(dividaTotalRestante)}</p>
            </div>
          </div>
        </>
      )}
    </section>
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

function KpiCardDelta({ icon, label, value, color, delta, invertDelta }) {
  return (
    <div className="rounded-xl border bg-white p-3.5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
          <span style={{ color }}>{icon}</span> {label}
        </div>
        <DeltaBadge value={delta} invert={invertDelta} />
      </div>
      <div className="font-mono tabular text-base sm:text-lg font-medium" style={{ color }}>{value}</div>
    </div>
  );
}

function DeltaBadge({ value, invert }) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-mono" style={{ color: good ? "var(--teal)" : "var(--rose)" }}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

function ChartCard({ title, right, children }) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function EmptyDashState({ text }) {
  return (
    <div className="text-sm rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}>
      {text}
    </div>
  );
}

function CategoryDonutWithList({ rows, big }) {
  if (!rows || rows.length === 0) {
    return <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Sem despesas neste período.</p>;
  }
  return (
    <div className={`flex flex-col ${big ? "" : "sm:flex-row"} items-center gap-4`}>
      <div className={big ? "w-full" : "w-full sm:w-1/2"}>
        <ResponsiveContainer width="100%" height={big ? 260 : 200}>
          <PieChart>
            <Pie data={rows} dataKey="total" nameKey="name" innerRadius={big ? 60 : 50} outerRadius={big ? 100 : 80} paddingAngle={2}>
              {rows.map((r, i) => <Cell key={r.categoryId} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 w-full space-y-1.5">
        {rows.slice(0, 8).map((r, i) => (
          <div key={r.categoryId} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
              {r.name}
            </span>
            <span className="font-mono tabular shrink-0">{formatBRL(r.total)} <span style={{ color: "var(--ink-soft)" }}>({r.pct}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryComparisonChart({ current, previous, categories }) {
  const merged = categories.filter((c) => c.group !== "receita").map((c) => {
    const atual = current.find((r) => r.categoryId === c.id)?.total || 0;
    const anterior = previous.find((r) => r.categoryId === c.id)?.total || 0;
    return { name: c.name, atual, anterior };
  }).filter((r) => r.atual > 0 || r.anterior > 0).sort((a, b) => b.atual - a.atual).slice(0, 8);

  if (merged.length === 0) {
    return <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Sem dados suficientes para comparar.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, merged.length * 40)}>
      <BarChart data={merged} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C_INK }} axisLine={false} tickLine={false} width={90} />
        <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="anterior" name="Mês anterior" fill={C_MUTEDBAR} radius={[0, 4, 4, 0]} />
        <Bar dataKey="atual" name="Este mês" fill={C_BRICK} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function prepColor(score) {
  if (score >= 70) return C_TEAL;
  if (score >= 34) return C_BRICK;
  return C_ROSE;
}

function prepTint(score) {
  if (score >= 70) return "#e8f3f0";
  if (score >= 34) return "#fdf1ed";
  return "#fbeeee";
}