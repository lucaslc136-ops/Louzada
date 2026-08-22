"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Landmark, ChevronDown, Search, Plus, X, LineChart } from "lucide-react";

const PADRAO = ["USD", "EUR", "BTC"];
const WATCHLIST_KEY = "louzada_investimentos_watchlist";
const OPCOES_DIAS = [7, 30, 90];

const EDUCACIONAL = [
  {
    titulo: "Tesouro Direto",
    texto: "Títulos públicos emitidos pelo governo federal. Você empresta dinheiro pro governo e recebe de volta com juros. Existem variações: prefixado (taxa fixa, definida na compra), Selic (acompanha a taxa básica de juros) e IPCA+ (acompanha a inflação mais um extra fixo). Costuma ser considerado um dos investimentos de menor risco do país, já que o governo federal raramente deixa de pagar.",
  },
  {
    titulo: "CDB (Certificado de Depósito Bancário)",
    texto: "Um empréstimo que você faz pro banco, em troca de juros. Muitos são pós-fixados, rendendo um percentual do CDI (ex: '110% do CDI'). Contam com proteção do FGC (Fundo Garantidor de Créditos) até um limite por CPF e instituição, o que reduz bastante o risco em caso de o banco quebrar.",
  },
  {
    titulo: "Fundos Imobiliários (FIIs)",
    texto: "Fundos que investem em imóveis (shoppings, galpões logísticos, prédios comerciais) ou em papéis ligados ao setor imobiliário. Você compra cotas negociadas na bolsa, e costuma receber uma renda mensal (aluguel dos imóveis do fundo), além da cota poder valorizar ou desvalorizar.",
  },
  {
    titulo: "Ações",
    texto: "Pequenas partes de uma empresa listada na bolsa. O valor sobe ou desce conforme o mercado avalia a empresa, e algumas pagam dividendos (parte do lucro distribuída aos acionistas). É considerado renda variável — sem garantia de retorno, podendo inclusive resultar em perda do valor investido.",
  },
  {
    titulo: "Renda fixa x Renda variável",
    texto: "Renda fixa (Tesouro, CDB, LCI/LCA) tem uma regra de rendimento definida desde a compra — mais previsível, geralmente menos arriscada. Renda variável (ações, FIIs, cripto) não tem retorno garantido, podendo valorizar ou desvalorizar bastante — geralmente mais arriscada, mas com potencial de retorno maior no longo prazo.",
  },
  {
    titulo: "Diversificação",
    texto: "Espalhar o dinheiro entre tipos diferentes de investimento, em vez de concentrar tudo num só, reduz o risco de uma perda grande de uma vez — se um investimento vai mal, os outros podem compensar. É um dos princípios mais repetidos por quem estuda investimentos, embora não elimine o risco por completo.",
  },
];

function loadWatchlist() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

// Gráfico de linha simples em SVG puro — sem depender de nenhuma biblioteca externa.
function GraficoHistorico({ dados, loading, erro }) {
  if (loading) {
    return <p className="text-xs py-6 text-center" style={{ color: "var(--ink-soft)" }}>Carregando histórico...</p>;
  }
  if (erro) {
    return <p className="text-xs py-6 text-center" style={{ color: "var(--rose)" }}>{erro}</p>;
  }
  if (!dados || dados.length < 2) {
    return <p className="text-xs py-6 text-center" style={{ color: "var(--ink-soft)" }}>Sem dados suficientes pra desenhar o gráfico.</p>;
  }

  const valores = dados.map((d) => d.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const largura = 600;
  const altura = 140;
  const pad = 8;
  const escalaX = (i) => pad + (i * (largura - pad * 2)) / (dados.length - 1);
  const escalaY = (v) => (max === min ? altura / 2 : altura - pad - ((v - min) * (altura - pad * 2)) / (max - min));
  const pontos = dados.map((d, i) => `${escalaX(i)},${escalaY(d.valor)}`).join(" ");
  const subiu = valores[valores.length - 1] >= valores[0];
  const corLinha = subiu ? "var(--teal)" : "var(--rose)";

  return (
    <div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
        <polyline points={pontos} fill="none" stroke={corLinha} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>
        <span>{dados[0].data}</span>
        <span className="font-mono tabular" style={{ color: "var(--ink)" }}>
          mín {min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · máx {max.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
        <span>{dados[dados.length - 1].data}</span>
      </div>
    </div>
  );
}

function QuoteCard({ code, nome, valor, variacaoPct, onRemove, onClick, ativo }) {
  const positivo = variacaoPct != null && variacaoPct >= 0;
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border bg-white p-4 relative w-full transition-shadow hover:shadow-sm"
      style={{ borderColor: ativo ? "var(--teal)" : "var(--border)" }}
    >
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 text-slate-300 hover:text-rose-600"
          title="Remover"
        >
          <X size={13} />
        </span>
      )}
      <p className="text-xs mb-1 flex items-center gap-1" style={{ color: "var(--ink-soft)" }}>
        {nome || code} <span className="opacity-60">({code})</span>
        <LineChart size={11} className="opacity-50" />
      </p>
      {valor == null ? (
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>—</p>
      ) : (
        <>
          <p className="font-mono tabular text-lg font-medium" style={{ color: "var(--ink)" }}>
            {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {variacaoPct != null && (
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: positivo ? "var(--teal)" : "var(--rose)" }}>
              {positivo ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {positivo ? "+" : ""}{variacaoPct.toFixed(2)}% hoje
            </p>
          )}
        </>
      )}
    </button>
  );
}

export default function InvestimentosPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [quotes, setQuotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState(null);

  const [disponiveis, setDisponiveis] = useState([]);
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);

  // --- gráfico de histórico ---
  const [graficoCode, setGraficoCode] = useState(null);
  const [graficoDias, setGraficoDias] = useState(30);
  const [historicoCache, setHistoricoCache] = useState({});
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState("");

  useEffect(() => {
    setWatchlist(loadWatchlist());
    fetch("/api/market/available").then((r) => r.json()).then((d) => setDisponiveis(d.moedas || [])).catch(() => {});
  }, []);

  const todosCodigos = useMemo(() => [...PADRAO, ...watchlist], [watchlist]);

  async function fetchQuotes(codigos) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/market/quotes?codes=${codigos.join(",")}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuotes(data);
    } catch (e) {
      setError(e.message || "Não consegui buscar as cotações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (todosCodigos.length > 0) fetchQuotes(todosCodigos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist]);

  function addToWatchlist(code) {
    if (todosCodigos.includes(code)) return;
    const next = [...watchlist, code];
    setWatchlist(next);
    saveWatchlist(next);
    setBusca("");
    setBuscaAberta(false);
  }

  function removeFromWatchlist(code) {
    const next = watchlist.filter((c) => c !== code);
    setWatchlist(next);
    saveWatchlist(next);
    if (graficoCode === code) setGraficoCode(null);
  }

  async function carregarHistorico(code, dias) {
    const cacheKey = `${code}-${dias}`;
    if (historicoCache[cacheKey]) return;
    setHistoricoLoading(true);
    setHistoricoErro("");
    try {
      const res = await fetch(`/api/market/history?code=${code}&days=${dias}`);
      const data = await res.json();
      if (data.error && (!data.historico || data.historico.length === 0)) {
        setHistoricoErro(data.error);
      }
      setHistoricoCache((prev) => ({ ...prev, [cacheKey]: data.historico || [] }));
    } catch {
      setHistoricoErro("Não consegui buscar o histórico agora.");
    } finally {
      setHistoricoLoading(false);
    }
  }

  function alternarGrafico(code) {
    if (graficoCode === code) {
      setGraficoCode(null);
      return;
    }
    setGraficoCode(code);
    setHistoricoErro("");
    carregarHistorico(code, graficoDias);
  }

  function mudarDias(dias) {
    setGraficoDias(dias);
    if (graficoCode) {
      setHistoricoErro("");
      carregarHistorico(graficoCode, dias);
    }
  }

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return [];
    const termo = busca.trim().toUpperCase();
    return disponiveis
      .filter((m) => !todosCodigos.includes(m.code))
      .filter((m) => m.code.includes(termo) || m.nome.toUpperCase().includes(termo))
      .slice(0, 8);
  }, [busca, disponiveis, todosCodigos]);

  const formatPct = (n) => `${n.toFixed(2)}% a.a.`;

  const graficoCacheKey = graficoCode ? `${graficoCode}-${graficoDias}` : null;
  const nomeGrafico = graficoCode
    ? (quotes?.cotacoes?.[graficoCode]?.nome || disponiveis.find((m) => m.code === graficoCode)?.nome || graficoCode)
    : "";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Investimentos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Cotações públicas — sem nenhuma recomendação, só informação.</p>
        </div>
        <button
          onClick={() => fetchQuotes(todosCodigos)} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
          <Search size={14} style={{ color: "var(--ink-soft)" }} />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setBuscaAberta(true); }}
            onFocus={() => setBuscaAberta(true)}
            placeholder="Buscar qualquer moeda ou cripto (ex: GBP, ETH, JPY...)"
            className="flex-1 text-sm outline-none"
          />
        </div>
        {buscaAberta && resultadosBusca.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border shadow-lg overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {resultadosBusca.map((m) => (
              <button
                key={m.code} onClick={() => addToWatchlist(m.code)}
                className="w-full flex items-center justify-between gap-2 text-xs px-3 py-2 hover:bg-slate-50 text-left"
              >
                <span>{m.nome} <span style={{ color: "var(--ink-soft)" }}>({m.code})</span></span>
                <Plus size={12} style={{ color: "var(--teal)" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs rounded-lg px-3.5 py-2.5" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{error}</p>
      )}

      {quotes && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PADRAO.map((code) => (
              <QuoteCard
                key={code} code={code}
                nome={quotes.cotacoes[code]?.nome} valor={quotes.cotacoes[code]?.valor} variacaoPct={quotes.cotacoes[code]?.variacaoPct}
                onClick={() => alternarGrafico(code)} ativo={graficoCode === code}
              />
            ))}
            {watchlist.map((code) => (
              <QuoteCard
                key={code} code={code}
                nome={quotes.cotacoes[code]?.nome} valor={quotes.cotacoes[code]?.valor} variacaoPct={quotes.cotacoes[code]?.variacaoPct}
                onClick={() => alternarGrafico(code)} ativo={graficoCode === code}
                onRemove={() => removeFromWatchlist(code)}
              />
            ))}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--ink-soft)" }}><Landmark size={13} /> Selic (meta)</div>
              {quotes.taxas.selic ? <p className="font-mono tabular text-lg font-medium" style={{ color: "var(--ink)" }}>{formatPct(quotes.taxas.selic.valor)}</p> : <p className="text-sm" style={{ color: "var(--ink-soft)" }}>—</p>}
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--ink-soft)" }}><Landmark size={13} /> CDI</div>
              {quotes.taxas.cdi ? <p className="font-mono tabular text-lg font-medium" style={{ color: "var(--ink)" }}>{formatPct(quotes.taxas.cdi.valor)}</p> : <p className="text-sm" style={{ color: "var(--ink-soft)" }}>—</p>}
            </div>
          </div>

          {graficoCode && (
            <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  Histórico — {nomeGrafico} <span className="opacity-60">({graficoCode})</span>
                </p>
                <div className="flex items-center gap-1">
                  {OPCOES_DIAS.map((d) => (
                    <button
                      key={d} onClick={() => mudarDias(d)}
                      className="text-[11px] px-2 py-1 rounded-md border"
                      style={{
                        borderColor: "var(--border)",
                        background: graficoDias === d ? "var(--ink)" : "transparent",
                        color: graficoDias === d ? "white" : "var(--ink-soft)",
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                  <button onClick={() => setGraficoCode(null)} className="text-slate-300 hover:text-rose-600 ml-1" title="Fechar">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <GraficoHistorico
                dados={historicoCache[graficoCacheKey]}
                loading={historicoLoading && !historicoCache[graficoCacheKey]}
                erro={historicoErro}
              />
            </div>
          )}

          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
            Câmbio e cripto: AwesomeAPI. Selic e CDI: Banco Central do Brasil. Clique num card pra ver o histórico de preço.
          </p>
        </>
      )}

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>O que é cada tipo de investimento</p>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
          Conteúdo geral e educacional — não é recomendação de compra, nem indicação do que é melhor pra vocês. Não somos consultores financeiros licenciados.
        </p>
        <div className="space-y-1.5">
          {EDUCACIONAL.map((item, i) => (
            <div key={item.titulo} className="border-t first:border-t-0 pt-1.5 first:pt-0" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setExpandido(expandido === i ? null : i)}
                className="w-full flex items-center justify-between gap-2 text-left py-1.5"
              >
                <span className="text-sm" style={{ color: "var(--ink)" }}>{item.titulo}</span>
                <ChevronDown size={14} className="shrink-0 transition-transform" style={{ color: "var(--ink-soft)", transform: expandido === i ? "rotate(180deg)" : "none" }} />
              </button>
              {expandido === i && (
                <p className="text-xs pb-2" style={{ color: "var(--ink-soft)" }}>{item.texto}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}