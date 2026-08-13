"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, Scale, CreditCard, PiggyBank, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts } from "@/lib/data/accounts";
import { listAllTransactions } from "@/lib/data/transactions";
import { listDebts } from "@/lib/data/debts";
import {
  MONTH_NAMES, CATEGORIES, formatBRL, toISODate, round2,
  accountsToMap, getEffectiveMonth, computeAccountBalance, computeCardInvoices,
  computeMonthlySeries, computeCategoryBreakdown, computeCardInvoiceHistory,
  computeDebtsAggregate, computeDebtStatus, prevMonthCursor,
} from "@/lib/finance/core";

const DASH_VIEWS = [
  { id: "visao", label: "Visão Geral" },
  { id: "fluxo", label: "Fluxo de Caixa" },
  { id: "despesas", label: "Despesas" },
  { id: "cartoes", label: "Cartões" },
  { id: "dividas", label: "Dívidas" },
  { id: "patrimonio", label: "Patrimônio" },
];

const CHART_PALETTE = ["#14202e", "#a8432a", "#1f6f5c", "#b8791a", "#5b6572", "#7c9885", "#c9a66b", "#8a5a44", "#4a6fa5", "#9b6b9e"];
const C_INK = "#14202e", C_TEAL = "#1f6f5c", C_ROSE = "#b23b3b", C_BRICK = "#a8432a", C_BORDER = "#e2e6ea", C_SOFT = "#5b6572", C_MUTEDBAR = "#c7ccd3";

export default function DashboardPage() {
  const supabase = createClient();
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [dashView, setDashView] = useState("visao");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hid = await getMyHouseholdId(supabase);
      setHouseholdId(hid);
      if (hid) {
        const [accs, txs, dbts] = await Promise.all([
          listAccounts(supabase, hid),
          listAllTransactions(supabase, hid),
          listDebts(supabase, hid),
        ]);
        setAccounts(accs);
        setTransactions(txs);
        setDebts(dbts);
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

  const monthLabel = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} de ${y}`;
  }, [monthCursor]);

  const accountsMap = useMemo(() => accountsToMap(accounts), [accounts]);
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
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(transactions, accountsMap, monthCursor), [transactions, accountsMap, monthCursor]);
  const categoryBreakdownPrev = useMemo(() => computeCategoryBreakdown(transactions, accountsMap, prevMonthCursor(monthCursor)), [transactions, accountsMap, monthCursor]);

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

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-full hover:bg-slate-200/60"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium tabular w-40 text-center">{monthLabel}</span>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-full hover:bg-slate-200/60"><ChevronRight size={16} /></button>
      </div>

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
            <CategoryComparisonChart current={categoryBreakdown.rows} previous={categoryBreakdownPrev.rows} />
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

function CategoryComparisonChart({ current, previous }) {
  const merged = CATEGORIES.filter((c) => c.group !== "receita").map((c) => {
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
