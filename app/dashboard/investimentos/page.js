"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Euro, Bitcoin, Landmark, ChevronDown } from "lucide-react";

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

function QuoteCard({ icon, label, valor, variacaoPct, formato }) {
  const positivo = variacaoPct != null && variacaoPct >= 0;
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--ink-soft)" }}>
        {icon} {label}
      </div>
      {valor == null ? (
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>—</p>
      ) : (
        <>
          <p className="font-mono tabular text-lg font-medium" style={{ color: "var(--ink)" }}>{formato(valor)}</p>
          {variacaoPct != null && (
            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: positivo ? "var(--teal)" : "var(--rose)" }}>
              {positivo ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {positivo ? "+" : ""}{variacaoPct.toFixed(2)}% hoje
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function InvestimentosPage() {
  const [quotes, setQuotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState(null);

  async function fetchQuotes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/market/quotes");
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
    fetchQuotes();
  }, []);

  const formatBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatPct = (n) => `${n.toFixed(2)}% a.a.`;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Investimentos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Cotações públicas — sem nenhuma recomendação, só informação.</p>
        </div>
        <button
          onClick={fetchQuotes} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {error && (
        <p className="text-xs rounded-lg px-3.5 py-2.5" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{error}</p>
      )}

      {quotes && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <QuoteCard icon={<DollarSign size={13} />} label="Dólar (USD)" valor={quotes.cambio.usd?.valor} variacaoPct={quotes.cambio.usd?.variacaoPct} formato={formatBRL} />
            <QuoteCard icon={<Euro size={13} />} label="Euro (EUR)" valor={quotes.cambio.eur?.valor} variacaoPct={quotes.cambio.eur?.variacaoPct} formato={formatBRL} />
            <QuoteCard icon={<Bitcoin size={13} />} label="Bitcoin (BTC)" valor={quotes.cambio.btc?.valor} variacaoPct={quotes.cambio.btc?.variacaoPct} formato={formatBRL} />
            <QuoteCard icon={<Landmark size={13} />} label="Selic (meta)" valor={quotes.taxas.selic?.valor} variacaoPct={null} formato={formatPct} />
            <QuoteCard icon={<Landmark size={13} />} label="CDI" valor={quotes.taxas.cdi?.valor} variacaoPct={null} formato={formatPct} />
          </div>
          <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
            Câmbio e Bitcoin: AwesomeAPI. Selic e CDI: Banco Central do Brasil (série {quotes.taxas.selic ? "mais recente disponível" : "—"}, data {quotes.taxas.selic?.data || "—"}).
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
