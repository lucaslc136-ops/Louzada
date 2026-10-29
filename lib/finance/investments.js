// Cálculos da carteira de investimentos. Funções puras, sem React nem Supabase, testadas à parte.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : fallback);

export const INVESTMENT_KINDS = [
  { id: "tesouro_selic", label: "Tesouro Selic", group: "renda_fixa" },
  { id: "tesouro_ipca", label: "Tesouro IPCA+", group: "renda_fixa" },
  { id: "tesouro_pre", label: "Tesouro Prefixado", group: "renda_fixa" },
  { id: "cdb", label: "CDB", group: "renda_fixa" },
  { id: "lci_lca", label: "LCI ou LCA", group: "renda_fixa" },
  { id: "fundo_di", label: "Fundo DI ou renda fixa", group: "renda_fixa" },
  { id: "renda_fixa_outro", label: "Outra renda fixa", group: "renda_fixa" },
  { id: "poupanca", label: "Poupança", group: "renda_fixa" },
  { id: "dinheiro_aplicado", label: "Dinheiro aplicado na conta", group: "renda_fixa" },
  { id: "fii", label: "Fundo imobiliário", group: "renda_variavel" },
  { id: "acao", label: "Ações", group: "renda_variavel" },
  { id: "etf", label: "ETF", group: "renda_variavel" },
  { id: "fundo", label: "Fundo de investimento", group: "renda_variavel" },
  { id: "cripto", label: "Cripto", group: "cripto" },
  { id: "previdencia", label: "Previdência", group: "outros" },
  { id: "outro", label: "Outro", group: "outros" },
];

export const GROUP_LABELS_INV = {
  renda_fixa: "Renda fixa",
  renda_variavel: "Renda variável",
  cripto: "Cripto",
  outros: "Outros",
};

export function kindInfo(id) {
  return INVESTMENT_KINDS.find((k) => k.id === id) || INVESTMENT_KINDS[INVESTMENT_KINDS.length - 1];
}

/* ------------------------------------------------------------------ */
/* RESUMO                                                              */
/* ------------------------------------------------------------------ */
export function summarizePortfolio(investments) {
  const list = (investments || []).filter((i) => num(i.valor_atual) > 0 || num(i.valor_aplicado) > 0);
  const totalAtual = round2(list.reduce((s, i) => s + num(i.valor_atual), 0));
  const totalAplicado = round2(list.reduce((s, i) => s + num(i.valor_aplicado), 0));
  const resultado = round2(totalAtual - totalAplicado);
  const resultadoPct = totalAplicado > 0 ? round2((resultado / totalAplicado) * 100) : null;

  const agrupa = (keyFn, labelFn) => {
    const mapa = new Map();
    for (const i of list) {
      const key = keyFn(i);
      const cur = mapa.get(key) || { key, label: labelFn(key, i), valor: 0 };
      cur.valor = round2(cur.valor + num(i.valor_atual));
      mapa.set(key, cur);
    }
    return [...mapa.values()]
      .map((x) => ({ ...x, pct: totalAtual > 0 ? round2((x.valor / totalAtual) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor);
  };

  const porTipo = agrupa((i) => i.kind || "outro", (k) => kindInfo(k).label);
  const porGrupo = agrupa((i) => kindInfo(i.kind).group, (g) => GROUP_LABELS_INV[g] || g);
  const porInstituicao = agrupa((i) => (i.institution || "").trim() || "Sem instituição", (k) => k);

  const maior = [...list].sort((a, b) => num(b.valor_atual) - num(a.valor_atual))[0];
  const maiorPosicao = maior && totalAtual > 0
    ? { nome: maior.name, valor: round2(num(maior.valor_atual)), pct: round2((num(maior.valor_atual) / totalAtual) * 100) }
    : null;

  const valorReserva = round2(list.filter((i) => i.reserva).reduce((s, i) => s + num(i.valor_atual), 0));

  return { totalAtual, totalAplicado, resultado, resultadoPct, porTipo, porGrupo, porInstituicao, maiorPosicao, valorReserva, quantidade: list.length };
}

/* ------------------------------------------------------------------ */
/* RESERVA DE EMERGÊNCIA                                               */
/* ------------------------------------------------------------------ */
// Quantos meses de despesa a reserva cobre. A meta de meses é escolha da pessoa (padrão 6).
export function emergencyReserveStatus({ valorReserva, despesaMediaMensal, metaMeses = 6 }) {
  const reserva = num(valorReserva);
  const despesa = num(despesaMediaMensal);
  if (despesa <= 0) return { mesesCobertos: null, metaMeses, valorMeta: null, falta: null, atingida: false };
  const mesesCobertos = round2(reserva / despesa);
  const valorMeta = round2(despesa * metaMeses);
  return { mesesCobertos, metaMeses, valorMeta, falta: round2(Math.max(0, valorMeta - reserva)), atingida: reserva >= valorMeta };
}

/* ------------------------------------------------------------------ */
/* PROJEÇÃO                                                            */
/* ------------------------------------------------------------------ */
export function monthlyRateFromAnnual(taxaAnualPct) {
  const a = num(taxaAnualPct) / 100;
  if (a <= -1) return -1;
  return Math.pow(1 + a, 1 / 12) - 1;
}

// Valor ao longo dos meses, com aporte no fim de cada mês. Devolve também quanto foi aportado,
// para separar o que é dinheiro seu do que é rendimento.
export function projectPortfolio({ atual, aporteMensal, taxaAnualPct, meses }) {
  const i = monthlyRateFromAnnual(taxaAnualPct);
  const n = Math.max(0, Math.floor(num(meses)));
  let valor = num(atual);
  let aportado = 0;
  const serie = [{ mes: 0, valor: round2(valor), aportado: 0 }];
  for (let m = 1; m <= n; m++) {
    valor = valor * (1 + i) + num(aporteMensal);
    aportado += num(aporteMensal);
    serie.push({ mes: m, valor: round2(valor), aportado: round2(aportado) });
  }
  const final = serie[serie.length - 1];
  return {
    serie,
    valorFinal: final.valor,
    totalAportado: final.aportado,
    rendimento: round2(final.valor - num(atual) - final.aportado),
  };
}

// Três cenários em torno da taxa escolhida. A diferença (em pontos percentuais) é parâmetro.
export function projectScenarios({ atual, aporteMensal, taxaAnualPct, meses, diferencaPp = 3 }) {
  const base = num(taxaAnualPct);
  const mk = (nome, taxa) => ({ nome, taxaAnualPct: round2(taxa), ...projectPortfolio({ atual, aporteMensal, taxaAnualPct: taxa, meses }) });
  return [mk("Conservador", Math.max(0, base - diferencaPp)), mk("Base", base), mk("Otimista", base + diferencaPp)];
}

// Em quantos meses a carteira chega à meta, com o aporte e a taxa informados. Null se não chega
// dentro do limite (padrão 100 anos) ou se não há como evoluir.
export function monthsToReach({ atual, aporteMensal, taxaAnualPct, meta, limiteMeses = 1200 }) {
  const alvo = num(meta);
  let valor = num(atual);
  if (valor >= alvo) return 0;
  const i = monthlyRateFromAnnual(taxaAnualPct);
  const aporte = num(aporteMensal);
  if (aporte <= 0 && i <= 0) return null;
  for (let m = 1; m <= limiteMeses; m++) {
    valor = valor * (1 + i) + aporte;
    if (valor >= alvo) return m;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* MOVIMENTOS                                                          */
/* ------------------------------------------------------------------ */
// Cada função devolve o novo estado do investimento (só valor_aplicado e valor_atual) e o movimento
// a registrar. Nada é gravado aqui.
export function applyContribution(inv, amount) {
  const v = round2(num(amount));
  if (!(v > 0)) throw new Error("valor_invalido");
  return {
    patch: { valor_aplicado: round2(num(inv.valor_aplicado) + v), valor_atual: round2(num(inv.valor_atual) + v) },
    entry: { kind: "aporte", amount: v, valor_apos: round2(num(inv.valor_atual) + v) },
  };
}

// Resgate reduz o custo na mesma proporção do que foi retirado, para o resultado (lucro) não mudar.
export function applyRedemption(inv, amount) {
  const v = round2(num(amount));
  const atual = num(inv.valor_atual);
  if (!(v > 0)) throw new Error("valor_invalido");
  if (v > atual + 0.005) throw new Error("resgate_maior_que_saldo");
  const novoAtual = round2(atual - v);
  const novoAplicado = atual > 0 ? round2(num(inv.valor_aplicado) * (novoAtual / atual)) : 0;
  return {
    patch: { valor_aplicado: novoAplicado, valor_atual: novoAtual },
    entry: { kind: "resgate", amount: v, valor_apos: novoAtual },
  };
}

export function applyValueUpdate(inv, novoValor) {
  const v = round2(num(novoValor, NaN));
  if (!Number.isFinite(v) || v < 0) throw new Error("valor_invalido");
  return {
    patch: { valor_atual: v },
    entry: { kind: "valor", amount: 0, valor_apos: v },
  };
}

/* ------------------------------------------------------------------ */
/* HISTÓRICO                                                           */
/* ------------------------------------------------------------------ */
// Valor total da carteira em cada data com movimento: para cada aplicação vale o último valor
// conhecido até aquela data.
export function buildPortfolioHistory(entries) {
  const ordenadas = [...(entries || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created_at || "") < (b.created_at || "") ? -1 : 1));
  const ultimo = new Map();
  const porData = new Map();
  for (const e of ordenadas) {
    ultimo.set(e.investment_id, num(e.valor_apos));
    let total = 0;
    for (const v of ultimo.values()) total += v;
    porData.set(e.date, round2(total));
  }
  return [...porData.entries()].map(([data, valor]) => ({ data, valor }));
}

// Média mensal de aportes nos últimos N meses (soma dos aportes dividida por N, não pelos meses com aporte).
export function averageMonthlyContribution(entries, todayISO, meses = 3) {
  const [y, m, d] = todayISO.split("-").map(Number);
  const inicio = new Date(y, m - 1 - meses, d);
  const inicioISO = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(inicio.getDate()).padStart(2, "0")}`;
  const soma = (entries || [])
    .filter((e) => e.kind === "aporte" && e.date > inicioISO && e.date <= todayISO)
    .reduce((s, e) => s + num(e.amount), 0);
  return round2(soma / meses);
}

/* ------------------------------------------------------------------ */
/* AVISOS (informativos, sem recomendação de compra)                   */
/* ------------------------------------------------------------------ */
export function portfolioNotices(summary, { limiteConcentracaoPct = 50 } = {}) {
  const avisos = [];
  if (!summary || summary.quantidade === 0) return avisos;
  if (summary.quantidade >= 2 && summary.maiorPosicao && summary.maiorPosicao.pct > limiteConcentracaoPct) {
    avisos.push(`"${summary.maiorPosicao.nome}" é ${Math.round(summary.maiorPosicao.pct)}% da carteira.`);
  }
  const cripto = summary.porGrupo.find((g) => g.key === "cripto");
  if (cripto && cripto.pct > 20) avisos.push(`Cripto é ${Math.round(cripto.pct)}% da carteira, uma classe que oscila bastante.`);
  return avisos;
}
