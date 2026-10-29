"use client";

import { useMemo, useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { parseBRNumber, formatBRL, round2 } from "@/lib/finance/core";
import { projectScenarios, monthsToReach } from "@/lib/finance/investments";

const CORES = { Conservador: "#8a97a6", Base: "#1f6f78", Otimista: "#c4623a" };

function mesesParaTexto(m) {
  if (m == null) return "não chega nesse prazo";
  if (m === 0) return "já atingida";
  const a = Math.floor(m / 12), r = m % 12;
  return [a ? `${a} ano${a > 1 ? "s" : ""}` : "", r ? `${r} mes${r > 1 ? "es" : ""}` : ""].filter(Boolean).join(" e ");
}

export default function ProjectionCard({ atual, aporteSugerido, taxaSugerida }) {
  const [aporte, setAporte] = useState("");
  const [taxa, setTaxa] = useState("");
  const [anos, setAnos] = useState("5");
  const [meta, setMeta] = useState("");
  const [tocouAporte, setTocouAporte] = useState(false);
  const [tocouTaxa, setTocouTaxa] = useState(false);

  // Sugestões entram só enquanto a pessoa não digitou nada.
  useEffect(() => { if (!tocouAporte && aporteSugerido > 0) setAporte(String(aporteSugerido).replace(".", ",")); }, [aporteSugerido, tocouAporte]);
  useEffect(() => { if (!tocouTaxa && taxaSugerida > 0) setTaxa(String(taxaSugerida).replace(".", ",")); }, [taxaSugerida, tocouTaxa]);

  const n = parseBRNumber(anos);
  const aporteN = aporte.trim() ? parseBRNumber(aporte) : 0;
  const taxaN = taxa.trim() ? parseBRNumber(taxa) : NaN;
  const metaN = meta.trim() ? parseBRNumber(meta) : null;
  const valido = Number.isFinite(n) && n > 0 && n <= 60 && Number.isFinite(aporteN) && aporteN >= 0 && Number.isFinite(taxaN) && taxaN >= 0 && taxaN <= 100;

  const cenarios = useMemo(
    () => (valido ? projectScenarios({ atual, aporteMensal: aporteN, taxaAnualPct: taxaN, meses: Math.round(n * 12) }) : null),
    [valido, atual, aporteN, taxaN, n]
  );
  const dadosGrafico = useMemo(() => {
    if (!cenarios) return [];
    const total = cenarios[0].serie.length;
    const passo = Math.max(1, Math.ceil(total / 60));
    const linhas = [];
    for (let i = 0; i < total; i += passo) {
      const linha = { mes: i, ano: `${Math.floor(i / 12)}a${i % 12 ? ` ${i % 12}m` : ""}` };
      for (const c of cenarios) linha[c.nome] = c.serie[i].valor;
      linhas.push(linha);
    }
    return linhas;
  }, [cenarios]);

  const mesesMeta = valido && metaN > 0
    ? monthsToReach({ atual, aporteMensal: aporteN, taxaAnualPct: taxaN, meta: metaN })
    : undefined;

  const campo = "w-full text-sm px-3 py-2 rounded-lg border";
  const estilo = { borderColor: "var(--border)" };

  return (
    <div className="rounded-xl border bg-white p-4" style={estilo}>
      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Para onde isso pode ir</p>
      <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--ink-soft)" }}>
        Simulação com rentabilidade constante, só para dar noção. Não é promessa de retorno.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Aporte por mês (R$)</span>
          <input inputMode="decimal" value={aporte} onChange={(e) => { setAporte(e.target.value); setTocouAporte(true); }} placeholder="0,00" className={campo} style={estilo} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Taxa (% ao ano)</span>
          <input inputMode="decimal" value={taxa} onChange={(e) => { setTaxa(e.target.value); setTocouTaxa(true); }} placeholder="ex: 11" className={campo} style={estilo} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Prazo (anos)</span>
          <input inputMode="decimal" value={anos} onChange={(e) => setAnos(e.target.value)} className={campo} style={estilo} />
        </label>
      </div>
      {taxaSugerida > 0 && !tocouTaxa && (
        <p className="text-[11px] mt-1.5" style={{ color: "var(--ink-soft)" }}>A taxa vem do CDI de hoje ({String(taxaSugerida).replace(".", ",")}% ao ano). Troque pela rentabilidade que você espera.</p>
      )}

      {!valido ? (
        <p className="text-xs mt-3" style={{ color: "var(--ink-soft)" }}>Preencha a taxa e o prazo (até 60 anos) para ver a projeção.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {cenarios.map((c) => (
              <div key={c.nome} className="rounded-lg border p-2.5" style={estilo}>
                <p className="text-[11px]" style={{ color: CORES[c.nome] }}>{c.nome} · {String(c.taxaAnualPct).replace(".", ",")}%</p>
                <p className="font-mono tabular text-sm font-medium mt-0.5" style={{ color: "var(--ink)" }}>{formatBRL(c.valorFinal)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                  você põe {formatBRL(round2(atual + c.totalAportado))}, rende {formatBRL(c.rendimento)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ee" vertical={false} />
                <XAxis dataKey="ano" tick={{ fontSize: 10, fill: "#6b7785" }} axisLine={{ stroke: "#e6e9ee" }} tickLine={false} interval="preserveStartEnd" minTickGap={30} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7785" }} axisLine={false} tickLine={false} width={52}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {cenarios.map((c) => <Line key={c.nome} type="monotone" dataKey={c.nome} stroke={CORES[c.nome]} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <label className="text-xs" style={{ color: "var(--ink-soft)" }}>Quero chegar a (R$)</label>
            <input inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="ex: 50.000"
              className="text-sm px-3 py-1.5 rounded-lg border w-32" style={estilo} />
            {metaN > 0 && mesesMeta !== undefined && (
              <span className="text-xs" style={{ color: "var(--ink)" }}>
                No cenário base, {mesesParaTexto(mesesMeta)}.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
