"use client";

import React, { useState, useMemo } from "react";
import {
  Home, ChevronRight, ChevronLeft, Check, AlertTriangle, CheckCircle2, XCircle,
  TrendingDown, TrendingUp, PieChart as PieChartIcon, Table as TableIcon, Repeat, ArrowLeftRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from "recharts";
import { MCMV_CONFIG, classificarFaixa } from "@/lib/mcmv/config";
import { calcularFinanciamento, agruparPorAno, round2 } from "@/lib/mcmv/financing";
import { avaliarElegibilidade, simularFinanciamento, simularQuantoPossoComprar, simularPorParcelaMaxima, comprometimentoRenda } from "@/lib/mcmv/simulation";
import { formatBRL, parseBRNumber } from "@/lib/finance/core";

const C_INK = "#14202e", C_TEAL = "#1f6f5c", C_ROSE = "#b23b3b", C_BRICK = "#a8432a", C_BORDER = "#e2e6ea", C_SOFT = "#5b6572", C_AMBER = "#b8791a";

const STEPS = ["Sua renda", "Seu imóvel", "Sua entrada", "Financiamento", "Resultado"];

export default function MCMVCalculator() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState("direta"); // direta | quanto-comprar | quanto-pagar
  const [showComparacao, setShowComparacao] = useState(false);

  const [form, setForm] = useState({
    renda: "4200", idade: "32", temFgts: true, fgts: "8000", dependentes: "1", primeiroImovel: true,
    rendaConjunta: false, rendaParceiro: "3000",
    valorImovel: "259000", estado: "SP", imovelUsado: false,
    entrada: "20000",
    prazoMeses: "420", sistema: "SAC",
    parcelaMaxima: "1200",
  });

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const rendaIndividualNum = parseBRNumber(form.renda) || 0;
  const rendaParceiroNum = form.rendaConjunta ? (parseBRNumber(form.rendaParceiro) || 0) : 0;
  const rendaNum = round2(rendaIndividualNum + rendaParceiroNum); // renda FAMILIAR — o que o MCMV realmente usa
  const fgtsNum = form.temFgts ? (parseBRNumber(form.fgts) || 0) : 0;
  const valorImovelNum = parseBRNumber(form.valorImovel) || 0;
  const entradaNum = parseBRNumber(form.entrada) || 0;
  const prazoNum = parseInt(form.prazoMeses, 10) || 0;
  const parcelaMaximaNum = parseBRNumber(form.parcelaMaxima) || 0;

  const elegibilidade = useMemo(() => avaliarElegibilidade({ renda: rendaNum, estado: form.estado, imovelUsado: form.imovelUsado }), [rendaNum, form.estado, form.imovelUsado]);

  const resultadoDireto = useMemo(() => {
    if (mode !== "direta" || !valorImovelNum || !prazoNum) return null;
    return simularFinanciamento({ renda: rendaNum, valorImovel: valorImovelNum, entrada: entradaNum, fgts: fgtsNum, prazoMeses: prazoNum, sistema: form.sistema, estado: form.estado, imovelUsado: form.imovelUsado });
  }, [mode, rendaNum, valorImovelNum, entradaNum, fgtsNum, prazoNum, form.sistema, form.estado, form.imovelUsado]);

  const resultadoQuantoComprar = useMemo(() => {
    if (mode !== "quanto-comprar" || !prazoNum) return null;
    return simularQuantoPossoComprar({ renda: rendaNum, entrada: entradaNum, fgts: fgtsNum, prazoMeses: prazoNum, sistema: form.sistema, estado: form.estado, imovelUsado: form.imovelUsado });
  }, [mode, rendaNum, entradaNum, fgtsNum, prazoNum, form.sistema, form.estado, form.imovelUsado]);

  const resultadoQuantoPagar = useMemo(() => {
    if (mode !== "quanto-pagar" || !prazoNum || !parcelaMaximaNum) return null;
    return simularPorParcelaMaxima({ renda: rendaNum, parcelaMaxima: parcelaMaximaNum, entrada: entradaNum, fgts: fgtsNum, prazoMeses: prazoNum, sistema: form.sistema, estado: form.estado, imovelUsado: form.imovelUsado });
  }, [mode, rendaNum, parcelaMaximaNum, entradaNum, fgtsNum, prazoNum, form.sistema, form.estado, form.imovelUsado]);

  const financiamentoAtivo = resultadoDireto?.financiamento || resultadoQuantoComprar?.financiamento || resultadoQuantoPagar?.financiamento;
  const comprometimentoAtivo = resultadoDireto?.comprometimento;

  function next() { setStep((s) => Math.min(STEPS.length - 1, s + 1)); }
  function back() { setStep((s) => Math.max(0, s - 1)); }

  return (
    <div className="max-w-2xl mx-auto" style={{ fontFamily: "-apple-system, sans-serif" }}>
      <style>{`.tabular{font-variant-numeric:tabular-nums}`}</style>

      {/* Indicador de progresso */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full h-1.5 rounded-full"
              style={{ background: i <= step ? C_BRICK : C_BORDER }}
            />
            <span className="text-[10px] text-center hidden sm:block" style={{ color: i === step ? C_INK : C_SOFT, fontWeight: i === step ? 600 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-5 sm:p-7" style={{ borderColor: C_BORDER }}>
        {step === 0 && <StepRenda form={form} setField={setField} elegibilidade={elegibilidade} rendaNum={rendaNum} />}
        {step === 1 && <StepImovel form={form} setField={setField} mode={mode} setMode={setMode} elegibilidade={elegibilidade} />}
        {step === 2 && <StepEntrada form={form} setField={setField} elegibilidade={elegibilidade} entradaNum={entradaNum} fgtsNum={fgtsNum} valorImovelNum={valorImovelNum} mode={mode} />}
        {step === 3 && <StepFinanciamento form={form} setField={setField} elegibilidade={elegibilidade} mode={mode} />}
        {step === 4 && (
          <StepResultado
            mode={mode} elegibilidade={elegibilidade}
            resultadoDireto={resultadoDireto} resultadoQuantoComprar={resultadoQuantoComprar} resultadoQuantoPagar={resultadoQuantoPagar}
            form={form} rendaNum={rendaNum}
            showComparacao={showComparacao} setShowComparacao={setShowComparacao}
          />
        )}

        <div className="flex justify-between mt-7 pt-5 border-t" style={{ borderColor: C_BORDER }}>
          <button
            onClick={back} disabled={step === 0}
            className="flex items-center gap-1 text-sm px-3.5 py-2 rounded-lg disabled:opacity-0"
            style={{ color: C_SOFT }}
          >
            <ChevronLeft size={15} /> Voltar
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex items-center gap-1 text-sm px-4 py-2 rounded-lg text-white" style={{ background: C_INK }}>
              Continuar <ChevronRight size={15} />
            </button>
          ) : (
            <span className="text-xs" style={{ color: C_SOFT }}>Simulação estimativa — veja o aviso abaixo</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <span className="block text-xs mb-1.5" style={{ color: C_SOFT }}>{children}</span>;
}
function inputStyle() { return { borderColor: C_BORDER }; }
const inputClass = "w-full text-sm px-3 py-2.5 rounded-lg border focus:outline-none";

function StepRenda({ form, setField, elegibilidade, rendaNum }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl mb-1" style={{ color: C_INK }}>Sua renda</h2>
        <p className="text-xs" style={{ color: C_SOFT }}>Usamos isso pra identificar sua faixa no Minha Casa Minha Vida.</p>
      </div>

      <label className="block">
        <FieldLabel>Sua renda mensal bruta (R$)</FieldLabel>
        <input type="text" inputMode="decimal" value={form.renda} onChange={(e) => setField("renda", e.target.value)} className={inputClass} style={inputStyle()} placeholder="ex: 4.200" />
      </label>

      <Toggle label="Vai financiar com mais alguém (renda conjunta)?" value={form.rendaConjunta} onChange={(v) => setField("rendaConjunta", v)} />

      {form.rendaConjunta && (
        <label className="block">
          <FieldLabel>Renda mensal bruta do(a) parceiro(a) (R$)</FieldLabel>
          <input type="text" inputMode="decimal" value={form.rendaParceiro} onChange={(e) => setField("rendaParceiro", e.target.value)} className={inputClass} style={inputStyle()} placeholder="ex: 3.000" />
        </label>
      )}

      {form.rendaConjunta && (
        <div className="rounded-lg px-3.5 py-2.5 flex justify-between text-xs" style={{ background: "#f3f5f7" }}>
          <span style={{ color: C_SOFT }}>Renda familiar considerada pelo MCMV</span>
          <span className="tabular font-medium" style={{ color: C_INK }}>{formatBRL(rendaNum)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <FieldLabel>Idade</FieldLabel>
          <input type="number" value={form.idade} onChange={(e) => setField("idade", e.target.value)} className={inputClass} style={inputStyle()} />
        </label>
        <label className="block">
          <FieldLabel>Dependentes (opcional)</FieldLabel>
          <input type="number" value={form.dependentes} onChange={(e) => setField("dependentes", e.target.value)} className={inputClass} style={inputStyle()} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Toggle label="Possui FGTS?" value={form.temFgts} onChange={(v) => setField("temFgts", v)} />
        <Toggle label="É seu primeiro imóvel?" value={form.primeiroImovel} onChange={(v) => setField("primeiroImovel", v)} />
      </div>

      {form.temFgts && (
        <label className="block">
          <FieldLabel>Valor disponível de FGTS (R$)</FieldLabel>
          <input type="text" inputMode="decimal" value={form.fgts} onChange={(e) => setField("fgts", e.target.value)} className={inputClass} style={inputStyle()} />
        </label>
      )}

      {rendaNum > 0 && (
        <div className="rounded-xl p-4 mt-2" style={{ background: elegibilidade.enquadrado ? "#e8f3f0" : "#fdf1ef" }}>
          {elegibilidade.enquadrado ? (
            <>
              <p className="text-sm font-medium" style={{ color: C_TEAL }}>
                {form.rendaConjunta ? "Com a renda conjunta, vocês se enquadram" : "Você se enquadra"} na {elegibilidade.faixa} do Minha Casa Minha Vida
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs" style={{ color: "#0a3a2e" }}>
                <span>Faixa de renda: {formatBRL(elegibilidade.rendaMin)} – {formatBRL(elegibilidade.rendaMax)}</span>
                <span>Taxa estimada: {elegibilidade.taxaAnualEstimadaPct}% a.a.</span>
                <span>Teto do imóvel: {formatBRL(elegibilidade.tetoImovel)}</span>
                <span>Subsídio estimado: {elegibilidade.temSubsidio ? formatBRL(elegibilidade.subsidioEstimado) : "não há nessa faixa"}</span>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: C_ROSE }}>
              {elegibilidade.motivo === "acima_teto"
                ? `${form.rendaConjunta ? "A renda conjunta está" : "Sua renda está"} acima do teto do Minha Casa Minha Vida — a simulação vai usar uma taxa de mercado ilustrativa em vez das condições do programa.`
                : "Informe uma renda válida."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StepImovel({ form, setField, mode, setMode, elegibilidade }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl mb-1" style={{ color: C_INK }}>Seu imóvel</h2>
        <p className="text-xs" style={{ color: C_SOFT }}>Já tem um imóvel em mente, ou quer descobrir o que cabe no seu bolso?</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <ModeOption active={mode === "direta"} onClick={() => setMode("direta")} title="Já sei o valor do imóvel" desc="Informo o valor e vejo a parcela" />
        <ModeOption active={mode === "quanto-comprar"} onClick={() => setMode("quanto-comprar")} title="Quanto eu consigo comprar?" desc="A partir da minha renda e entrada" />
        <ModeOption active={mode === "quanto-pagar"} onClick={() => setMode("quanto-pagar")} title="Quanto posso pagar por mês?" desc="A partir de uma parcela-alvo" />
      </div>

      {mode === "direta" && (
        <label className="block">
          <FieldLabel>Valor do imóvel (R$)</FieldLabel>
          <input type="text" inputMode="decimal" value={form.valorImovel} onChange={(e) => setField("valorImovel", e.target.value)} className={inputClass} style={inputStyle()} />
        </label>
      )}
      {mode === "quanto-pagar" && (
        <label className="block">
          <FieldLabel>Parcela máxima desejada (R$)</FieldLabel>
          <input type="text" inputMode="decimal" value={form.parcelaMaxima} onChange={(e) => setField("parcelaMaxima", e.target.value)} className={inputClass} style={inputStyle()} />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <FieldLabel>Estado</FieldLabel>
          <select value={form.estado} onChange={(e) => setField("estado", e.target.value)} className={inputClass} style={inputStyle()}>
            {MCMV_CONFIG.estados.map((e) => <option key={e.sigla} value={e.sigla}>{e.nome}</option>)}
          </select>
        </label>
        <Toggle label="Imóvel usado?" value={form.imovelUsado} onChange={(v) => setField("imovelUsado", v)} />
      </div>
    </div>
  );
}

function StepEntrada({ form, setField, elegibilidade, entradaNum, fgtsNum, valorImovelNum, mode }) {
  const subsidio = elegibilidade.enquadrado ? elegibilidade.subsidioEstimado || 0 : 0;
  const totalEntrada = round2(entradaNum + fgtsNum + subsidio);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl mb-1" style={{ color: C_INK }}>Sua entrada</h2>
        <p className="text-xs" style={{ color: C_SOFT }}>FGTS e subsídio (quando houver) entram automaticamente na conta.</p>
      </div>

      <label className="block">
        <FieldLabel>Valor da entrada em dinheiro (R$)</FieldLabel>
        <input type="text" inputMode="decimal" value={form.entrada} onChange={(e) => setField("entrada", e.target.value)} className={inputClass} style={inputStyle()} />
      </label>

      <div className="rounded-xl p-4" style={{ background: "#f3f5f7" }}>
        <div className="flex justify-between text-xs mb-1.5"><span style={{ color: C_SOFT }}>Entrada em dinheiro</span><span className="tabular">{formatBRL(entradaNum)}</span></div>
        <div className="flex justify-between text-xs mb-1.5"><span style={{ color: C_SOFT }}>+ FGTS disponível</span><span className="tabular">{formatBRL(fgtsNum)}</span></div>
        <div className="flex justify-between text-xs mb-1.5"><span style={{ color: C_SOFT }}>+ Subsídio estimado</span><span className="tabular">{formatBRL(subsidio)}</span></div>
        <div className="flex justify-between text-sm font-medium pt-1.5 mt-1.5 border-t" style={{ borderColor: C_BORDER, color: C_INK }}>
          <span>Total de entrada</span><span className="tabular">{formatBRL(totalEntrada)}</span>
        </div>
        {mode === "direta" && valorImovelNum > 0 && (
          <div className="flex justify-between text-xs mt-2 pt-2 border-t" style={{ borderColor: C_BORDER }}>
            <span style={{ color: C_SOFT }}>Ficaria financiado</span>
            <span className="tabular font-medium" style={{ color: totalEntrada > valorImovelNum ? C_ROSE : C_INK }}>
              {formatBRL(Math.max(0, valorImovelNum - totalEntrada))}
            </span>
          </div>
        )}
      </div>
      {mode === "direta" && totalEntrada > valorImovelNum && valorImovelNum > 0 && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: C_ROSE }}>
          <AlertTriangle size={13} /> Sua entrada já cobre o valor do imóvel — não sobra nada pra financiar.
        </p>
      )}
    </div>
  );
}

function StepFinanciamento({ form, setField, elegibilidade, mode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl mb-1" style={{ color: C_INK }}>Financiamento</h2>
        <p className="text-xs" style={{ color: C_SOFT }}>Prazo e sistema de amortização.</p>
      </div>

      <label className="block">
        <FieldLabel>Prazo: {form.prazoMeses} meses ({round2(parseInt(form.prazoMeses, 10) / 12)} anos)</FieldLabel>
        <input
          type="range" min={MCMV_CONFIG.prazoMinimoMeses} max={MCMV_CONFIG.prazoMaximoMeses} step="12"
          value={form.prazoMeses} onChange={(e) => setField("prazoMeses", e.target.value)}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: C_SOFT }}>
          <span>{MCMV_CONFIG.prazoMinimoMeses / 12} anos</span>
          <span>{MCMV_CONFIG.prazoMaximoMeses / 12} anos (máximo MCMV)</span>
        </div>
      </label>

      <div>
        <FieldLabel>Sistema de amortização</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <SistemaOption active={form.sistema === "SAC"} onClick={() => setField("sistema", "SAC")} title="SAC" desc="Parcelas decrescentes, amortização constante" />
          <SistemaOption active={form.sistema === "Price"} onClick={() => setField("sistema", "Price")} title="Price" desc="Parcela fixa do início ao fim" />
        </div>
      </div>

      <div className="rounded-xl p-3.5 text-xs" style={{ background: "#f3f5f7", color: C_SOFT }}>
        Taxa estimada: <strong style={{ color: C_INK }}>{elegibilidade.enquadrado ? `${elegibilidade.taxaAnualEstimadaPct}% a.a.` : "10% a.a. (fora do MCMV, ilustrativa)"}</strong> — condição real depende de análise de crédito.
      </div>
    </div>
  );
}

function StepResultado({ mode, elegibilidade, resultadoDireto, resultadoQuantoComprar, resultadoQuantoPagar, form, rendaNum, showComparacao, setShowComparacao }) {
  if (mode === "quanto-comprar" && resultadoQuantoComprar) {
    const r = resultadoQuantoComprar;
    return (
      <div className="space-y-5">
        <ResultHeader title="Quanto você consegue comprar" />
        <div className="rounded-xl p-5 text-center" style={{ background: "#e8f3f0" }}>
          <p className="text-xs mb-1" style={{ color: "#0a3a2e" }}>Com essa renda, seu imóvel poderia custar até</p>
          <p className="font-serif text-3xl" style={{ color: C_TEAL }}>{formatBRL(r.valorMaximoImovel)}</p>
          {r.capadoPeloTeto && <p className="text-[11px] mt-1" style={{ color: "#0a3a2e" }}>(limitado pelo teto da {r.elegibilidade.faixa}: {formatBRL(r.elegibilidade.tetoImovel)})</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricBox label="Financiamento máximo" value={formatBRL(r.valorFinanciado)} />
          <MetricBox label="Entrada considerada" value={formatBRL(r.entradaDisponivel)} />
          <MetricBox label="Parcela estimada" value={formatBRL(r.financiamento?.parcelaInicial)} />
          <MetricBox label="Faixa MCMV" value={r.elegibilidade.faixa || "—"} />
        </div>
        <AvisoLegal />
      </div>
    );
  }

  if (mode === "quanto-pagar" && resultadoQuantoPagar) {
    const r = resultadoQuantoPagar;
    return (
      <div className="space-y-5">
        <ResultHeader title="Quanto você pode financiar" />
        <div className="rounded-xl p-5 text-center" style={{ background: "#e8f3f0" }}>
          <p className="text-xs mb-1" style={{ color: "#0a3a2e" }}>Com uma parcela de até {formatBRL(parseBRNumber(form.parcelaMaxima))}, você poderia financiar cerca de</p>
          <p className="font-serif text-3xl" style={{ color: C_TEAL }}>{formatBRL(r.valorFinanciadoMax)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricBox label="Valor estimado do imóvel" value={formatBRL(r.valorImovelEstimado)} />
          <MetricBox label="Entrada considerada" value={formatBRL(r.entradaTotal)} />
          <MetricBox label="Parcela real resultante" value={formatBRL(r.financiamento?.parcelaInicial)} />
          <MetricBox label="Faixa MCMV" value={r.elegibilidade.faixa || "—"} />
        </div>
        <AvisoLegal />
      </div>
    );
  }

  if (mode === "direta" && resultadoDireto?.financiamento) {
    const r = resultadoDireto;
    const fin = r.financiamento;
    const comp = r.comprometimento;
    return (
      <div className="space-y-5">
        <ResultHeader title="Seu primeiro imóvel" />

        <IndicadorSemaforo nivel={comp.nivel} pct={comp.pct} />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricBox label="Imóvel" value={formatBRL(parseBRNumber(form.valorImovel))} />
          <MetricBox label="Entrada total" value={formatBRL(r.entradaTotal)} />
          <MetricBox label="Financiamento" value={formatBRL(r.valorFinanciado)} />
          <MetricBox label="Faixa MCMV" value={r.elegibilidade.faixa || "fora do programa"} />
          <MetricBox label="Parcela inicial" value={formatBRL(fin.parcelaInicial)} highlight />
          <MetricBox label="Parcela final" value={formatBRL(fin.parcelaFinal)} />
          <MetricBox label="Prazo" value={`${form.prazoMeses} meses`} />
          <MetricBox label="Taxa estimada" value={`${r.elegibilidade.enquadrado ? r.elegibilidade.taxaAnualEstimadaPct : "10"}% a.a.`} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricBox label="Total pago ao final" value={formatBRL(fin.totalPago)} />
          <MetricBox label="Total de juros" value={formatBRL(fin.totalJuros)} tone="rose" />
        </div>

        <GraficosFinanciamento financiamento={fin} valorFinanciado={r.valorFinanciado} />
        <TabelaAmortizacao tabela={fin.tabela} />

        <button
          onClick={() => setShowComparacao((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border"
          style={{ borderColor: C_BORDER, color: C_INK }}
        >
          <ArrowLeftRight size={14} /> {showComparacao ? "Fechar comparação" : "Comparar com outros cenários"}
        </button>
        {showComparacao && <ComparacaoCenarios base={form} rendaNum={rendaNum} />}

        <AvisoLegal />
      </div>
    );
  }

  return <p className="text-sm" style={{ color: C_SOFT }}>Preencha os passos anteriores pra ver o resultado.</p>;
}

function ResultHeader({ title }) {
  return (
    <div className="flex items-center gap-2">
      <Home size={18} style={{ color: C_BRICK }} />
      <h2 className="font-serif text-xl" style={{ color: C_INK }}>{title}</h2>
    </div>
  );
}

function IndicadorSemaforo({ nivel, pct }) {
  const map = {
    confortavel: { color: C_TEAL, bg: "#e8f3f0", Icon: CheckCircle2, label: "Financiamento aparentemente compatível com sua renda" },
    limite: { color: C_AMBER, bg: "#faf1e6", Icon: AlertTriangle, label: "Financiamento no limite da sua capacidade" },
    incompativel: { color: C_ROSE, bg: "#fdf1ef", Icon: XCircle, label: "Financiamento provavelmente incompatível com sua renda" },
  };
  const cfg = map[nivel] || map.limite;
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: cfg.bg }}>
      <cfg.Icon size={22} style={{ color: cfg.color }} className="shrink-0" />
      <div>
        <p className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
        <p className="text-xs mt-0.5" style={{ color: C_SOFT }}>Comprometimento da renda: <strong>{pct}%</strong> (parcela ÷ renda)</p>
      </div>
    </div>
  );
}

function MetricBox({ label, value, highlight, tone }) {
  const color = tone === "rose" ? C_ROSE : highlight ? C_BRICK : C_INK;
  return (
    <div className="rounded-lg p-3" style={{ background: "#f3f5f7" }}>
      <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: C_SOFT }}>{label}</p>
      <p className="tabular font-medium" style={{ color }}>{value}</p>
    </div>
  );
}

function GraficosFinanciamento({ financiamento, valorFinanciado }) {
  const [tab, setTab] = useState("parcela");
  const porAno = useMemo(() => agruparPorAno(financiamento.tabela), [financiamento]);
  const composicao = [
    { name: "Amortização (principal)", value: valorFinanciado },
    { name: "Juros", value: financiamento.totalJuros },
  ];

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: C_BORDER }}>
      <div className="flex gap-1.5 mb-4">
        <ChartTab active={tab === "parcela"} onClick={() => setTab("parcela")} label="Parcela" Icon={TrendingDown} />
        <ChartTab active={tab === "saldo"} onClick={() => setTab("saldo")} label="Saldo devedor" Icon={TrendingUp} />
        <ChartTab active={tab === "composicao"} onClick={() => setTab("composicao")} label="Composição" Icon={PieChartIcon} />
      </div>

      {tab === "parcela" && (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={porAno}>
            <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 10, fill: C_SOFT }} tickFormatter={(v) => `Ano ${v}`} axisLine={{ stroke: C_BORDER }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={60} />
            <Tooltip formatter={(v) => formatBRL(v)} labelFormatter={(v) => `Ano ${v}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
            <Area type="monotone" dataKey="parcelaMedia" name="Parcela média" stroke={C_BRICK} fill={C_BRICK} fillOpacity={0.12} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {tab === "saldo" && (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={porAno}>
            <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 10, fill: C_SOFT }} tickFormatter={(v) => `Ano ${v}`} axisLine={{ stroke: C_BORDER }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C_SOFT }} axisLine={false} tickLine={false} width={60} />
            <Tooltip formatter={(v) => formatBRL(v)} labelFormatter={(v) => `Ano ${v}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
            <Area type="monotone" dataKey="saldoFinal" name="Saldo devedor" stroke={C_INK} fill={C_INK} fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {tab === "composicao" && (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={composicao} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
              <Cell fill={C_TEAL} />
              <Cell fill={C_ROSE} />
            </Pie>
            <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C_BORDER}` }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ChartTab({ active, onClick, label, Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
      style={active ? { background: C_INK, color: "white" } : { background: "#f3f5f7", color: C_SOFT }}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

function TabelaAmortizacao({ tabela }) {
  const [visao, setVisao] = useState("mes"); // mes | ano
  const [pagina, setPagina] = useState(0);
  const porAno = useMemo(() => agruparPorAno(tabela), [tabela]);
  const porPagina = 12;
  const totalPaginas = Math.ceil(tabela.length / porPagina);
  const linhasMes = tabela.slice(pagina * porPagina, pagina * porPagina + porPagina);

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: C_BORDER }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: C_INK }}><TableIcon size={14} /> Evolução do financiamento</p>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "#f3f5f7" }}>
          <button onClick={() => setVisao("mes")} className="text-[11px] px-2.5 py-1 rounded-md" style={visao === "mes" ? { background: "white", color: C_INK } : { color: C_SOFT }}>Por mês</button>
          <button onClick={() => setVisao("ano")} className="text-[11px] px-2.5 py-1 rounded-md" style={visao === "ano" ? { background: "white", color: C_INK } : { color: C_SOFT }}>Por ano</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left" style={{ color: C_SOFT }}>
              <th className="py-1.5 font-medium">{visao === "mes" ? "Mês" : "Ano"}</th>
              <th className="py-1.5 font-medium text-right">{visao === "mes" ? "Parcela" : "Parcela média"}</th>
              <th className="py-1.5 font-medium text-right">Juros</th>
              <th className="py-1.5 font-medium text-right">Amortização</th>
              <th className="py-1.5 font-medium text-right">Saldo devedor</th>
            </tr>
          </thead>
          <tbody>
            {(visao === "mes" ? linhasMes : porAno).map((r) => (
              <tr key={visao === "mes" ? r.mes : r.ano} className="border-t" style={{ borderColor: C_BORDER }}>
                <td className="py-1.5 tabular">{visao === "mes" ? r.mes : r.ano}</td>
                <td className="py-1.5 tabular text-right">{formatBRL(visao === "mes" ? r.parcela : r.parcelaMedia)}</td>
                <td className="py-1.5 tabular text-right" style={{ color: C_ROSE }}>{formatBRL(visao === "mes" ? r.juros : r.jurosTotal)}</td>
                <td className="py-1.5 tabular text-right" style={{ color: C_TEAL }}>{formatBRL(visao === "mes" ? r.amortizacao : r.amortizacaoTotal)}</td>
                <td className="py-1.5 tabular text-right">{formatBRL(r.saldoFinal ?? r.saldoDevedor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visao === "mes" && (
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0} className="text-xs px-2.5 py-1 rounded-lg border disabled:opacity-40" style={{ borderColor: C_BORDER }}>← Anterior</button>
          <span className="text-[11px]" style={{ color: C_SOFT }}>Meses {pagina * porPagina + 1}–{Math.min(tabela.length, pagina * porPagina + porPagina)} de {tabela.length}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1} className="text-xs px-2.5 py-1 rounded-lg border disabled:opacity-40" style={{ borderColor: C_BORDER }}>Próximo →</button>
        </div>
      )}
    </div>
  );
}

function ComparacaoCenarios({ base, rendaNum }) {
  const valorBase = parseBRNumber(base.valorImovel) || 259000;
  const cenarios = [
    { label: "Cenário A", valorImovel: round2(valorBase * 0.85), entrada: parseBRNumber(base.entrada) || 20000 },
    { label: "Cenário B (seu)", valorImovel: valorBase, entrada: parseBRNumber(base.entrada) || 20000 },
    { label: "Cenário C", valorImovel: round2(valorBase * 1.15), entrada: round2((parseBRNumber(base.entrada) || 20000) * 1.5) },
  ];
  const resultados = cenarios.map((c) => {
    const r = simularFinanciamento({
      renda: rendaNum, valorImovel: c.valorImovel, entrada: c.entrada,
      fgts: base.temFgts ? (parseBRNumber(base.fgts) || 0) : 0,
      prazoMeses: parseInt(base.prazoMeses, 10), sistema: base.sistema, estado: base.estado, imovelUsado: base.imovelUsado,
    });
    return { ...c, r };
  });

  return (
    <div className="rounded-xl border p-4 overflow-x-auto" style={{ borderColor: C_BORDER }}>
      <table className="w-full text-xs min-w-[480px]">
        <thead>
          <tr className="text-left" style={{ color: C_SOFT }}>
            <th className="py-1.5 font-medium"> </th>
            {resultados.map((c) => <th key={c.label} className="py-1.5 font-medium text-right">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          <ComparRow label="Valor imóvel" values={resultados.map((c) => formatBRL(c.valorImovel))} />
          <ComparRow label="Entrada" values={resultados.map((c) => formatBRL(c.entrada))} />
          <ComparRow label="Financiamento" values={resultados.map((c) => formatBRL(c.r.valorFinanciado))} />
          <ComparRow label="Parcela inicial" values={resultados.map((c) => formatBRL(c.r.financiamento?.parcelaInicial))} />
          <ComparRow label="Parcela final" values={resultados.map((c) => formatBRL(c.r.financiamento?.parcelaFinal))} />
          <ComparRow label="Juros totais" values={resultados.map((c) => formatBRL(c.r.financiamento?.totalJuros))} tone={C_ROSE} />
          <ComparRow label="Total pago" values={resultados.map((c) => formatBRL(c.r.financiamento?.totalPago))} />
        </tbody>
      </table>
    </div>
  );
}
function ComparRow({ label, values, tone }) {
  return (
    <tr className="border-t" style={{ borderColor: C_BORDER }}>
      <td className="py-1.5" style={{ color: C_SOFT }}>{label}</td>
      {values.map((v, i) => <td key={i} className="py-1.5 tabular text-right" style={{ color: tone || C_INK }}>{v}</td>)}
    </tr>
  );
}

function AvisoLegal() {
  return (
    <p className="text-[11px] leading-relaxed rounded-lg p-3" style={{ background: "#f3f5f7", color: C_SOFT }}>
      Esta é uma simulação estimativa. As condições reais podem variar de acordo com análise de crédito, relacionamento bancário,
      composição de renda, características do imóvel, seguros, tarifas e regras vigentes. Valores das faixas do MCMV consolidados
      de fontes públicas de 2026 — a validar contra a fonte oficial da CAIXA antes de qualquer decisão real.
    </p>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: C_BORDER }}>
        <button onClick={() => onChange(true)} className="flex-1 text-sm py-2" style={value ? { background: C_INK, color: "white" } : { color: C_SOFT }}>Sim</button>
        <button onClick={() => onChange(false)} className="flex-1 text-sm py-2" style={!value ? { background: C_INK, color: "white" } : { color: C_SOFT }}>Não</button>
      </div>
    </div>
  );
}

function ModeOption({ active, onClick, title, desc }) {
  return (
    <button onClick={onClick} className="text-left rounded-xl border p-3.5 flex items-center gap-3" style={active ? { borderColor: C_BRICK, background: "#fdf1ed" } : { borderColor: C_BORDER }}>
      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: active ? C_BRICK : C_BORDER }}>
        {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: C_BRICK }} />}
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: C_INK }}>{title}</p>
        <p className="text-xs" style={{ color: C_SOFT }}>{desc}</p>
      </div>
    </button>
  );
}

function SistemaOption({ active, onClick, title, desc }) {
  return (
    <button onClick={onClick} className="text-left rounded-xl border p-3.5" style={active ? { borderColor: C_BRICK, background: "#fdf1ed" } : { borderColor: C_BORDER }}>
      <p className="text-sm font-medium" style={{ color: active ? C_BRICK : C_INK }}>{title}</p>
      <p className="text-[11px] mt-0.5" style={{ color: C_SOFT }}>{desc}</p>
    </button>
  );
}
