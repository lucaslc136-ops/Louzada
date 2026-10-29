"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ChevronDown, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, RefreshCcw, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { createClient } from "@/lib/supabase/client";
import LoadError from "@/components/load-error";
import InvestmentForm from "@/components/investimentos/investment-form";
import MovementModal from "@/components/investimentos/movement-modal";
import ProjectionCard from "@/components/investimentos/projection-card";
import MarketPanel from "@/components/investimentos/market-panel";
import { getMyHouseholdId, listAccounts } from "@/lib/data/accounts";
import { listAllTransactions } from "@/lib/data/transactions";
import { listInvestments, listInvestmentEntries, createInvestment, updateInvestmentFields, registerMovement, deleteInvestment } from "@/lib/data/investments";
import { formatBRL, toISODate, round2, accountsToMap, computeMonthlySeries, prevMonthCursor } from "@/lib/finance/core";
import {
  summarizePortfolio, emergencyReserveStatus, buildPortfolioHistory, averageMonthlyContribution, portfolioNotices, kindInfo,
} from "@/lib/finance/investments";

const META_RESERVA_KEY = "louzada_reserva_meses";

function lerMetaReserva() {
  try {
    const v = parseInt(localStorage.getItem(META_RESERVA_KEY) || "6", 10);
    return [3, 6, 12].includes(v) ? v : 6;
  } catch {
    return 6;
  }
}

function Kpi({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border bg-white p-3.5" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{label}</p>
      <p className="font-mono tabular text-lg font-medium mt-1" style={{ color: color || "var(--ink)" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{sub}</p>}
    </div>
  );
}

function BarraDistribuicao({ titulo, linhas }) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
      <p className="text-sm font-medium mb-3" style={{ color: "var(--ink)" }}>{titulo}</p>
      <div className="space-y-2.5">
        {linhas.map((l) => (
          <div key={l.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="truncate">{l.label}</span>
              <span className="font-mono tabular shrink-0 ml-2" style={{ color: "var(--ink-soft)" }}>{formatBRL(l.valor)} · {Math.round(l.pct)}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "#edf0f4" }}>
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, l.pct)}%`, background: "var(--teal)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvestimentosPage() {
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => toISODate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [householdId, setHouseholdId] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [formState, setFormState] = useState(null); // { inv } | { inv: null }
  const [movement, setMovement] = useState(null); // { inv, kind }
  const [busy, setBusy] = useState(false);
  const [mercadoAberto, setMercadoAberto] = useState(false);
  const [toast, setToast] = useState("");
  const [metaMeses, setMetaMeses] = useState(6);
  const [taxas, setTaxas] = useState({});

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const reloadCarteira = useCallback(async (hid) => {
    const [invs, ents] = await Promise.all([listInvestments(supabase, hid), listInvestmentEntries(supabase, hid)]);
    setInvestments(invs);
    setEntries(ents);
  }, [supabase]);

  useEffect(() => {
    setMetaMeses(lerMetaReserva());
    fetch("/api/market/quotes?codes=USD").then((r) => r.json()).then((d) => setTaxas(d.taxas || {})).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const hid = await getMyHouseholdId(supabase);
        setHouseholdId(hid);
        if (hid) {
          const [invs, ents, accs, txs] = await Promise.all([
            listInvestments(supabase, hid), listInvestmentEntries(supabase, hid), listAccounts(supabase, hid), listAllTransactions(supabase, hid),
          ]);
          setInvestments(invs); setEntries(ents); setAccounts(accs); setTransactions(txs);
        }
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempt]);

  const resumo = useMemo(() => summarizePortfolio(investments), [investments]);
  const avisos = useMemo(() => portfolioNotices(resumo), [resumo]);
  const historico = useMemo(() => buildPortfolioHistory(entries), [entries]);
  const aporteMedio = useMemo(() => averageMonthlyContribution(entries, today, 3), [entries, today]);

  // Despesa média dos 3 últimos meses fechados, para medir a reserva de emergência.
  const despesaMedia = useMemo(() => {
    if (accounts.length === 0) return 0;
    const mapa = accountsToMap(accounts);
    const fimMes = prevMonthCursor(today.slice(0, 7));
    const serie = computeMonthlySeries(transactions, mapa, fimMes, 3);
    return round2(serie.reduce((s, m) => s + m.despesas, 0) / 3);
  }, [accounts, transactions, today]);
  const reserva = useMemo(
    () => emergencyReserveStatus({ valorReserva: resumo.valorReserva, despesaMediaMensal: despesaMedia, metaMeses }),
    [resumo.valorReserva, despesaMedia, metaMeses]
  );

  function mudarMetaReserva(v) {
    setMetaMeses(v);
    try { localStorage.setItem(META_RESERVA_KEY, String(v)); } catch { /* só uma conveniência */ }
  }

  async function handleSave(fields) {
    setBusy(true);
    try {
      if (formState?.inv) {
        await updateInvestmentFields(supabase, formState.inv.id, fields);
        showToast("Aplicação atualizada.");
      } else {
        await createInvestment(supabase, householdId, fields, today);
        showToast("Aplicação adicionada.");
      }
      setFormState(null);
      await reloadCarteira(householdId);
    } catch {
      showToast("Não consegui salvar. Nada foi alterado, tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMovement(valor, data) {
    setBusy(true);
    try {
      await registerMovement(supabase, householdId, movement.inv, movement.kind, valor, data);
      showToast(movement.kind === "aporte" ? "Aporte registrado." : movement.kind === "resgate" ? "Resgate registrado." : "Valor atualizado.");
      setMovement(null);
      await reloadCarteira(householdId);
    } catch {
      showToast("Não consegui registrar. Nada foi alterado, tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(inv) {
    const ok = window.confirm(`Excluir "${inv.name}"? O histórico dessa aplicação também será apagado. Isso não afeta nenhum lançamento seu.`);
    if (!ok) return;
    try {
      await deleteInvestment(supabase, inv.id);
      showToast("Aplicação excluída.");
      await reloadCarteira(householdId);
    } catch {
      showToast("Não consegui excluir.");
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando…</p>;
  if (loadError) return <LoadError onRetry={() => setLoadAttempt((n) => n + 1)} />;
  if (!householdId) return <p className="text-sm" style={{ color: "var(--rose)" }}>Não encontrei sua família. Tente recarregar a página.</p>;

  const resultadoCor = resumo.resultado >= 0 ? "var(--teal)" : "var(--rose)";
  const cdi = taxas?.cdi?.valor;
  const taxaSugerida = Number.isFinite(cdi) ? round2(cdi) : 0;
  const pctReserva = reserva.valorMeta ? Math.min(100, Math.round((resumo.valorReserva / reserva.valorMeta) * 100)) : 0;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Investimentos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Sua carteira, o que ela rendeu e para onde pode ir.</p>
        </div>
        <button onClick={() => setFormState({ inv: null })} className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg text-white shrink-0" style={{ background: "var(--ink)" }}>
          <Plus size={14} /> Nova
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--ink)" }}>Você ainda não cadastrou nenhuma aplicação.</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--ink-soft)" }}>
            Cadastre o que você já tem (Tesouro, CDB, ações, cripto) com quanto vale hoje. A partir daí o app mostra resultado, distribuição, reserva de emergência e projeções, e soma tudo ao seu patrimônio.
          </p>
          <button onClick={() => setFormState({ inv: null })} className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "var(--ink)" }}>Cadastrar primeira aplicação</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Vale hoje" value={formatBRL(resumo.totalAtual)} />
            <Kpi label="Você aplicou" value={formatBRL(resumo.totalAplicado)} />
            <Kpi
              label="Resultado" value={`${resumo.resultado >= 0 ? "+" : ""}${formatBRL(resumo.resultado)}`} color={resultadoCor}
              sub={resumo.resultadoPct != null ? `${resumo.resultadoPct >= 0 ? "+" : ""}${String(resumo.resultadoPct).replace(".", ",")}% sobre o aplicado` : null}
            />
            <Kpi label="Aporte médio" value={formatBRL(aporteMedio)} sub="por mês, últimos 3 meses" />
          </div>

          {avisos.length > 0 && (
            <div className="rounded-lg px-3.5 py-2.5 text-xs space-y-1" style={{ background: "#fdf3dc", color: "var(--amber)" }}>
              {avisos.map((a) => <p key={a}>{a}</p>)}
            </div>
          )}

          <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--ink)" }}><ShieldCheck size={15} /> Reserva de emergência</p>
              <label className="text-xs flex items-center gap-1.5" style={{ color: "var(--ink-soft)" }}>
                meta
                <select value={metaMeses} onChange={(e) => mudarMetaReserva(parseInt(e.target.value, 10))} className="text-xs px-1.5 py-1 rounded border" style={{ borderColor: "var(--border)" }}>
                  {[3, 6, 12].map((m) => <option key={m} value={m}>{m} meses</option>)}
                </select>
              </label>
            </div>
            {reserva.mesesCobertos == null ? (
              <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
                {resumo.valorReserva > 0 ? "Sem histórico de despesas suficiente para medir." : "Marque as aplicações que fazem parte da sua reserva e eu calculo quantos meses de despesa ela cobre."}
              </p>
            ) : (
              <>
                <p className="text-sm mt-2" style={{ color: "var(--ink)" }}>
                  Cobre <strong>{String(reserva.mesesCobertos).replace(".", ",")} meses</strong> das suas despesas ({formatBRL(resumo.valorReserva)} de {formatBRL(reserva.valorMeta)}).
                </p>
                <div className="h-2 rounded-full mt-2" style={{ background: "#edf0f4" }}>
                  <div className="h-2 rounded-full" style={{ width: `${pctReserva}%`, background: reserva.atingida ? "var(--teal)" : "var(--amber)" }} />
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--ink-soft)" }}>
                  Despesa média de {formatBRL(despesaMedia)} por mês (3 últimos meses fechados, sem contar pagamento de fatura).
                  {!reserva.atingida && ` Faltam ${formatBRL(reserva.falta)} para a meta.`}
                </p>
              </>
            )}
          </div>

          <div>
            <h2 className="font-serif text-lg mb-2">Minha carteira</h2>
            <div className="space-y-2.5">
              {investments.map((inv) => {
                const res = round2(Number(inv.valor_atual) - Number(inv.valor_aplicado));
                const pct = Number(inv.valor_aplicado) > 0 ? round2((res / Number(inv.valor_aplicado)) * 100) : null;
                return (
                  <div key={inv.id} className="rounded-xl border bg-white p-3.5 relative" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{inv.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
                          {kindInfo(inv.kind).label}{inv.institution ? ` · ${inv.institution}` : ""}
                          {inv.vencimento ? ` · vence ${inv.vencimento.split("-").reverse().join("/")}` : ""}
                          {inv.taxa_anual != null ? ` · ${String(inv.taxa_anual).replace(".", ",")}% a.a.` : ""}
                        </p>
                        {inv.reserva && <span className="inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded" style={{ background: "#e3f1ee", color: "var(--teal)" }}>reserva de emergência</span>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono tabular text-sm font-medium">{formatBRL(Number(inv.valor_atual))}</p>
                        <p className="text-[11px] font-mono tabular" style={{ color: res >= 0 ? "var(--teal)" : "var(--rose)" }}>
                          {res >= 0 ? "+" : ""}{formatBRL(res)}{pct != null ? ` (${String(pct).replace(".", ",")}%)` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <button onClick={() => setMovement({ inv, kind: "aporte" })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)" }}><ArrowUpCircle size={12} /> Aportar</button>
                      <button onClick={() => setMovement({ inv, kind: "resgate" })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)" }}><ArrowDownCircle size={12} /> Resgatar</button>
                      <button onClick={() => setMovement({ inv, kind: "valor" })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)" }}><RefreshCcw size={12} /> Atualizar valor</button>
                      <span className="flex-1" />
                      <button onClick={() => setFormState({ inv })} className="text-slate-400 hover:text-slate-700 p-1.5" title="Editar"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(inv)} className="text-slate-400 hover:text-rose-600 p-1.5" title="Excluir"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <BarraDistribuicao titulo="Por classe" linhas={resumo.porGrupo} />
          <BarraDistribuicao titulo="Por tipo" linhas={resumo.porTipo} />
          {resumo.porInstituicao.length > 1 && <BarraDistribuicao titulo="Por instituição" linhas={resumo.porInstituicao} />}

          {historico.length >= 2 && (
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--ink)" }}>Evolução da carteira</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={historico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ee" vertical={false} />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: "#6b7785" }} axisLine={{ stroke: "#e6e9ee" }} tickLine={false} tickFormatter={(d) => d.slice(5).split("-").reverse().join("/")} minTickGap={30} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7785" }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => formatBRL(v)} labelFormatter={(d) => d.split("-").reverse().join("/")} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="stepAfter" dataKey="valor" name="Carteira" stroke="#1f6f78" fill="#1f6f78" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>O gráfico cresce conforme você registra aportes e atualiza os valores.</p>
            </div>
          )}

          <ProjectionCard atual={resumo.totalAtual} aporteSugerido={aporteMedio} taxaSugerida={taxaSugerida} />
        </>
      )}

      <div>
        <button onClick={() => setMercadoAberto((v) => !v)} className="w-full flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
          Cotações, taxas e conteúdo educativo
          <ChevronDown size={15} style={{ transform: mercadoAberto ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {mercadoAberto && <div className="mt-3"><MarketPanel onTaxas={setTaxas} /></div>}
      </div>

      {formState && <InvestmentForm inv={formState.inv} onSave={handleSave} onClose={() => setFormState(null)} busy={busy} />}
      {movement && <MovementModal inv={movement.inv} kind={movement.kind} onConfirm={handleMovement} onClose={() => setMovement(null)} busy={busy} />}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50" style={{ background: "var(--ink)" }}>{toast}</div>
      )}
    </div>
  );
}
