// Lógica de domínio financeiro, sem nenhuma dependência de React ou Supabase —
// só funções puras, fáceis de testar isoladas.

export const CATEGORIES = [
  { id: "renda", name: "Renda", group: "receita", subcategories: ["Salário", "Freelance", "Investimentos", "Outros"] },
  { id: "moradia", name: "Moradia", group: "necessidades", subcategories: ["Aluguel", "Condomínio", "Água", "Luz", "Gás", "Internet", "IPTU", "Manutenção"] },
  { id: "alimentacao", name: "Alimentação", group: "necessidades", subcategories: ["Mercado", "Restaurante", "Delivery", "Padaria"] },
  { id: "transporte", name: "Transporte", group: "necessidades", subcategories: ["App de transporte", "Combustível", "Estacionamento", "Transporte público"] },
  { id: "saude", name: "Saúde", group: "necessidades", subcategories: ["Farmácia", "Consulta", "Plano de saúde", "Academia"] },
  { id: "educacao", name: "Educação", group: "necessidades", subcategories: ["Curso", "Livros", "Mensalidade"] },
  { id: "lazer", name: "Lazer", group: "desejos", subcategories: ["Streaming", "Cinema", "Bar", "Viagem", "Ingressos"] },
  { id: "compras", name: "Compras", group: "desejos", subcategories: ["Roupas", "Eletrônicos", "Diversos"] },
  { id: "futuro", name: "Futuro", group: "futuro", subcategories: ["Reserva de emergência", "Investimento", "Fundo do imóvel", "Pagamento de dívida"] },
  { id: "outros", name: "Outros", group: "necessidades", subcategories: ["Diversos"] },
];

export const KEYWORD_MAP = [
  { kw: "ifood", categoryId: "alimentacao", subcategory: "Delivery" },
  { kw: "rappi", categoryId: "alimentacao", subcategory: "Delivery" },
  { kw: "supermercado", categoryId: "alimentacao", subcategory: "Mercado" },
  { kw: "mercado", categoryId: "alimentacao", subcategory: "Mercado" },
  { kw: "padaria", categoryId: "alimentacao", subcategory: "Padaria" },
  { kw: "restaurante", categoryId: "alimentacao", subcategory: "Restaurante" },
  { kw: "lanchonete", categoryId: "alimentacao", subcategory: "Restaurante" },
  { kw: "uber", categoryId: "transporte", subcategory: "App de transporte" },
  { kw: "99", categoryId: "transporte", subcategory: "App de transporte" },
  { kw: "taxi", categoryId: "transporte", subcategory: "App de transporte" },
  { kw: "gasolina", categoryId: "transporte", subcategory: "Combustível" },
  { kw: "combustivel", categoryId: "transporte", subcategory: "Combustível" },
  { kw: "estacionamento", categoryId: "transporte", subcategory: "Estacionamento" },
  { kw: "pedagio", categoryId: "transporte", subcategory: "Estacionamento" },
  { kw: "onibus", categoryId: "transporte", subcategory: "Transporte público" },
  { kw: "metro", categoryId: "transporte", subcategory: "Transporte público" },
  { kw: "luz", categoryId: "moradia", subcategory: "Luz" },
  { kw: "energia", categoryId: "moradia", subcategory: "Luz" },
  { kw: "agua", categoryId: "moradia", subcategory: "Água" },
  { kw: "aluguel", categoryId: "moradia", subcategory: "Aluguel" },
  { kw: "condominio", categoryId: "moradia", subcategory: "Condomínio" },
  { kw: "internet", categoryId: "moradia", subcategory: "Internet" },
  { kw: "gas", categoryId: "moradia", subcategory: "Gás" },
  { kw: "iptu", categoryId: "moradia", subcategory: "IPTU" },
  { kw: "farmacia", categoryId: "saude", subcategory: "Farmácia" },
  { kw: "remedio", categoryId: "saude", subcategory: "Farmácia" },
  { kw: "medico", categoryId: "saude", subcategory: "Consulta" },
  { kw: "academia", categoryId: "saude", subcategory: "Academia" },
  { kw: "netflix", categoryId: "lazer", subcategory: "Streaming" },
  { kw: "spotify", categoryId: "lazer", subcategory: "Streaming" },
  { kw: "cinema", categoryId: "lazer", subcategory: "Cinema" },
  { kw: "shopping", categoryId: "compras", subcategory: "Diversos" },
  { kw: "salario", categoryId: "renda", subcategory: "Salário" },
  { kw: "freela", categoryId: "renda", subcategory: "Freelance" },
];

export const PAYMENT_METHODS = ["Débito", "Crédito", "Pix", "Dinheiro", "Boleto", "Transferência"];
export const RECURRENCE_OPTIONS = [
  { id: "nenhuma", label: "Não se repete" },
  { id: "mensal", label: "Mensal" },
  { id: "semanal", label: "Semanal" },
  { id: "anual", label: "Anual" },
];

export const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

// Categorias padrão (fixas, sempre existem) + categorias que a família criou — usar essa lista
// mesclada em qualquer lugar que o usuário escolhe/vê categorias. categoryById sozinho continua
// funcionando só com as padrão, pra código antigo que ainda não foi atualizado não quebrar.
export function mergeCategories(customCategories = []) {
  const mapped = customCategories.map((c) => ({
    id: c.id, name: c.name, group: c.group_name, subcategories: c.subcategories?.length ? c.subcategories : ["Diversos"], custom: true,
  }));
  return [...CATEGORIES, ...mapped];
}

export function categoryByIdIn(id, categoriesList) {
  return categoriesList.find((c) => c.id === id) || categoryById(id);
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const targetMonthFirst = new Date(y, m - 1 + n, 1);
  const lastDayOfTargetMonth = new Date(targetMonthFirst.getFullYear(), targetMonthFirst.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDayOfTargetMonth);
  return toISODate(new Date(targetMonthFirst.getFullYear(), targetMonthFirst.getMonth(), day));
}

export function addDaysISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toISODate(date);
}

export function addYearsISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setFullYear(date.getFullYear() + n);
  return toISODate(date);
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatBRL(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "R$ " + Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDatePt(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function removeAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Evita falsos positivos como "gas" dentro de "gastei" ou "99" dentro de "R$ 99,00"
function keywordMatches(text, kw) {
  const safe = escapeRegex(kw);
  if (/^\d+$/.test(kw)) {
    return new RegExp(`(?<![\\d.,])${safe}(?![\\d.,])`).test(text);
  }
  return new RegExp(`\\b${safe}\\b`).test(text);
}

// Interpreta números como um brasileiro digita: "1.500,00", "1500,00" ou "1500.5".
export function parseBRNumber(input) {
  if (input === null || input === undefined) return NaN;
  let s = String(input).trim();
  if (!s) return NaN;
  s = s.replace(/[^\d,.\-]/g, "");
  s = s.replace(/\.(?=\d{3}(\D|$))/g, "");
  s = s.replace(",", ".");
  return parseFloat(s);
}

export function parseNaturalLanguage(rawText, accounts) {
  const text = removeAccents(rawText.toLowerCase());
  const today = toISODate(new Date());

  let value = null;
  let m = text.match(/r\$\s*([\d]{1,3}(?:\.[\d]{3})*,[\d]{2}|[\d]+,[\d]{2}|[\d]+)/);
  if (!m) m = text.match(/([\d]{1,3}(?:\.[\d]{3})*,[\d]{2}|[\d]+,[\d]{2})/);
  if (!m) m = text.match(/(\d+(?:,\d{2})?)\s*(?:reais|conto|pila)\b/);
  if (m) {
    let raw = m[1];
    raw = raw.replace(/\.(?=\d{3}(,|$))/g, "").replace(",", ".");
    value = parseFloat(raw);
  }

  const despesaKw = ["gastei", "paguei", "comprei", "gasto de", "saiu"];
  const receitaKw = ["recebi", "ganhei", "entrou", "caiu", "salario"];
  let type = "despesa";
  if (receitaKw.some((k) => text.includes(k))) type = "receita";
  else if (despesaKw.some((k) => text.includes(k))) type = "despesa";

  let date = today;
  if (text.includes("anteontem")) date = addDaysISO(today, -2);
  else if (text.includes("ontem")) date = addDaysISO(today, -1);
  else if (text.includes("hoje")) date = today;
  else {
    const dm = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dm) {
      let [, dd, mm, yy] = dm;
      let year = yy ? (yy.length === 2 ? "20" + yy : yy) : String(new Date().getFullYear());
      date = `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    } else {
      const diaMatch = text.match(/\bdia (\d{1,2})\b/);
      if (diaMatch) {
        const now = new Date();
        date = toISODate(new Date(now.getFullYear(), now.getMonth(), parseInt(diaMatch[1], 10)));
      }
    }
  }

  let categoryId = type === "receita" ? "renda" : "outros";
  let subcategory = type === "receita" ? "Outros" : "Diversos";
  for (const entry of KEYWORD_MAP) {
    if (keywordMatches(text, entry.kw)) {
      categoryId = entry.categoryId;
      subcategory = entry.subcategory;
      break;
    }
  }

  let accountId = null;
  for (const acc of accounts) {
    if (keywordMatches(text, removeAccents(acc.name.toLowerCase()))) {
      accountId = acc.id;
      break;
    }
  }

  return {
    type, value, date, categoryId, subcategory,
    accountId: accountId || (accounts[0] ? accounts[0].id : null),
    note: rawText.trim(),
    valueFound: value !== null,
  };
}

/* ------------------------------------------------------------------ */
/* CONTAS, CARTÕES E DÍVIDAS                                          */
/* ------------------------------------------------------------------ */

export function computeAccountBalance(account, transactions, todayISO) {
  let bal = Number(account.saldo_inicial) || 0;
  for (const t of transactions) {
    if (t.account_id === account.id && t.date <= todayISO) {
      bal += t.type === "receita" ? Number(t.value) : -Number(t.value);
    }
  }
  return round2(bal);
}

// Em qual mês de fatura uma compra de cartão cai. Compras até o dia de fechamento entram na fatura
// que fecha NESSE mês; depois do fechamento, entram na fatura que fecha no mês seguinte.
export function invoiceBucketFromDate(dateISO, diaFechamento) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const offset = d <= diaFechamento ? 0 : 1;
  const totalMonths = y * 12 + (m - 1) + offset;
  const by = Math.floor(totalMonths / 12);
  const bm = (totalMonths % 12) + 1;
  return `${by}-${String(bm).padStart(2, "0")}`;
}

export function addMonthsToBucket(bucket, n) {
  const [y, m] = bucket.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function nextBucket(bucket) {
  return addMonthsToBucket(bucket, 1);
}

export function formatBucketLabel(bucket) {
  const [y, m] = bucket.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]}/${y}`;
}

// Usa o rótulo de fatura já gravado na parcela (evita recalcular a partir de uma data já deslocada,
// o que causaria um segundo deslocamento); só recalcula pela data para lançamentos sem esse rótulo.
export function resolveInvoiceBucket(t, diaFechamento) {
  return t.invoice_bucket || invoiceBucketFromDate(t.date, diaFechamento);
}

export function computeCardInvoices(card, transactions, todayISO) {
  const diaFechamento = Number(card.dia_fechamento) || 25;
  const totals = {};
  for (const t of transactions) {
    if (t.account_id === card.id && t.type === "despesa") {
      const b = resolveInvoiceBucket(t, diaFechamento);
      totals[b] = round2((totals[b] || 0) + Number(t.value));
    }
  }
  const current = invoiceBucketFromDate(todayISO, diaFechamento);
  const next = nextBucket(current);
  return {
    currentBucket: current, currentTotal: totals[current] || 0,
    nextBucket: next, nextTotal: totals[next] || 0,
  };
}

// Quantas parcelas de uma dívida já venceram até hoje (inclusive a de hoje)
export function monthsElapsedInclusive(startISO, todayISO) {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ty, tm, td] = todayISO.split("-").map(Number);
  let months = ty * 12 + (tm - 1) - (sy * 12 + (sm - 1));
  if (td >= sd) months += 1;
  return Math.max(0, months);
}

export function computeDebtStatus(debt, todayISO) {
  const total = Number(debt.total_parcelas) || 0;
  const parcela = Number(debt.parcela) || 0;
  const pagas = Math.min(total, monthsElapsedInclusive(debt.data_primeira_parcela, todayISO));
  const valorPago = round2(pagas * parcela);
  const valorRestante = round2(Math.max(0, total - pagas) * parcela);
  const quitada = pagas >= total;
  const proximoVencimento = quitada ? null : addMonthsISO(debt.data_primeira_parcela, pagas);
  return { pagas, total, valorPago, valorRestante, quitada, proximoVencimento };
}

/* ------------------------------------------------------------------ */
/* REGIME DE CAIXA x REGIME DE COMPETÊNCIA                            */
/* ------------------------------------------------------------------ */
// Toda transação tem uma "data da compra" (t.date) — é quando o lançamento aconteceu e é o que
// decide em qual mês ele aparece na lista. Mas pra cálculos de fluxo de caixa (Despesas do mês,
// Saldo, Orçamento etc.), uma compra no CARTÃO só deveria contar no mês em que a fatura vence —
// débito/Pix/dinheiro continuam contando no próprio mês da compra, sem mudança.
//
// accountsById: um objeto { [id]: account }, não um array — monta com Object.fromEntries antes de usar.

export function getEffectiveMonth(t, accountsById) {
  const acc = accountsById[t.account_id];
  if (acc && acc.type === "cartao") {
    const diaFechamento = Number(acc.dia_fechamento) || 25;
    const bucket = t.invoice_bucket || invoiceBucketFromDate(t.date, diaFechamento);
    return bucket;
  }
  return t.date.slice(0, 7);
}

export function accountsToMap(accounts) {
  return Object.fromEntries(accounts.map((a) => [a.id, a]));
}

export function prevMonthCursor(monthCursor) {
  const [y, m] = monthCursor.split("-").map(Number);
  const total = y * 12 + (m - 1) - 1;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* AGREGAÇÕES DO DASHBOARD                                            */
/* ------------------------------------------------------------------ */

export function lastNMonthBuckets(endMonthISO, n) {
  const [ey, em] = endMonthISO.split("-").map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = ey * 12 + (em - 1) - i;
    const y = Math.floor(total / 12), m = (total % 12) + 1;
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

// Série mensal de receitas/despesas — despesas de cartão contam no mês da fatura, não da compra
// (mesmo critério de fluxo de caixa usado na tela de Lançamentos).
export function computeMonthlySeries(transactions, accountsMap, endMonthISO, n) {
  return lastNMonthBuckets(endMonthISO, n).map((mo) => {
    let receitas = 0, despesas = 0;
    for (const t of transactions) {
      if (getEffectiveMonth(t, accountsMap) !== mo) continue;
      if (t.type === "receita") receitas += Number(t.value); else despesas += Number(t.value);
    }
    return {
      month: mo, label: MONTH_NAMES[parseInt(mo.split("-")[1], 10) - 1].slice(0, 3),
      receitas: round2(receitas), despesas: round2(despesas), saldo: round2(receitas - despesas),
    };
  });
}

export function computeCategoryBreakdown(transactions, accountsMap, monthISO, categoriesList = CATEGORIES) {
  const totals = {};
  let sum = 0;
  for (const t of transactions) {
    if (t.type === "despesa" && getEffectiveMonth(t, accountsMap) === monthISO) {
      totals[t.category_id] = round2((totals[t.category_id] || 0) + Number(t.value));
      sum += Number(t.value);
    }
  }
  const rows = Object.entries(totals).map(([categoryId, total]) => ({
    categoryId, name: categoryByIdIn(categoryId, categoriesList)?.name || categoryId, total,
    pct: sum > 0 ? round2((total / sum) * 100) : 0,
  }));
  rows.sort((a, b) => b.total - a.total);
  return { rows, sum: round2(sum) };
}

export function computeCardInvoiceHistory(card, transactions, endBucketISO, n) {
  const diaFechamento = Number(card.dia_fechamento) || 25;
  const totals = {};
  for (const t of transactions) {
    if (t.account_id === card.id && t.type === "despesa") {
      const b = resolveInvoiceBucket(t, diaFechamento);
      totals[b] = round2((totals[b] || 0) + Number(t.value));
    }
  }
  return lastNMonthBuckets(endBucketISO, n).map((b) => ({
    bucket: b, label: MONTH_NAMES[parseInt(b.split("-")[1], 10) - 1].slice(0, 3), total: totals[b] || 0,
  }));
}

export function computeDebtsAggregate(debts, todayISO) {
  let totalRestante = 0, totalPago = 0, parcelaMensalAtiva = 0;
  for (const d of debts) {
    const st = computeDebtStatus(d, todayISO);
    totalRestante += st.valorRestante;
    totalPago += st.valorPago;
    if (!st.quitada) parcelaMensalAtiva += Number(d.parcela) || 0;
  }
  return { totalRestante: round2(totalRestante), totalPago: round2(totalPago), parcelaMensalAtiva: round2(parcelaMensalAtiva) };
}

/* ------------------------------------------------------------------ */
/* ORÇAMENTO 50/30/20                                                 */
/* ------------------------------------------------------------------ */
// O planejado de cada grupo é sempre uma % da receita real do mês — se sua renda mudar, o
// planejado acompanha sozinho, sem precisar editar nada. O gasto usa o mês de IMPACTO no fluxo de
// caixa (mesmo critério do resto do app): compra no cartão conta no grupo no mês em que a fatura vence.

export const GROUP_ORDER = ["necessidades", "desejos", "futuro"];
export const GROUP_LABELS = { necessidades: "Necessidades", desejos: "Desejos", futuro: "Futuro" };

export function computeBudgetGroups(transactions, accountsMap, monthISO, receitasMes, settings, categoriesList = CATEGORIES) {
  const gastoPorGrupo = { necessidades: 0, desejos: 0, futuro: 0 };
  for (const t of transactions) {
    if (t.type === "despesa" && getEffectiveMonth(t, accountsMap) === monthISO) {
      const cat = categoryByIdIn(t.category_id, categoriesList);
      const g = cat?.group;
      if (g && Object.prototype.hasOwnProperty.call(gastoPorGrupo, g)) gastoPorGrupo[g] += Number(t.value);
    }
  }
  return GROUP_ORDER.map((g) => {
    const pctRaw = parseBRNumber(settings[`budget_${g}`]);
    const pct = isNaN(pctRaw) ? 0 : pctRaw;
    const planejado = round2((receitasMes * pct) / 100);
    const gasto = round2(gastoPorGrupo[g]);
    const usoPct = planejado > 0 ? Math.round((gasto / planejado) * 100) : gasto > 0 ? 999 : 0;
    return { group: g, pct, planejado, gasto, saldo: round2(planejado - gasto), usoPct };
  });
}

/* ------------------------------------------------------------------ */
/* META DO PRIMEIRO IMÓVEL                                            */
/* ------------------------------------------------------------------ */
// O "fundo do imóvel" é todo lançamento de despesa na categoria Futuro, subcategoria
// "Fundo do imóvel" — é assim que a pessoa "guarda dinheiro" dentro da lógica de lançamentos do app.
export const GOAL_SUBCATEGORY = "Fundo do imóvel";

function isGoalContribution(t) {
  return t.type === "despesa" && t.category_id === "futuro" && t.subcategory === GOAL_SUBCATEGORY;
}

// Média mensal aportada nos últimos N meses (olha só meses que já têm lançamento, pra não puxar a
// média pra baixo por causa de meses futuros ou muito antigos sem nada).
function mediaMensalAporte(transactions, todayISO, n = 6) {
  const buckets = lastNMonthBuckets(todayISO.slice(0, 7), n);
  const porMes = {};
  for (const t of transactions) {
    if (!isGoalContribution(t)) continue;
    const mo = t.date.slice(0, 7);
    if (buckets.includes(mo)) porMes[mo] = round2((porMes[mo] || 0) + Number(t.value));
  }
  const mesesComAporte = Object.values(porMes);
  if (mesesComAporte.length === 0) return 0;
  return round2(mesesComAporte.reduce((s, v) => s + v, 0) / mesesComAporte.length);
}

export function computeGoalMetrics(settings, transactions, todayISO) {
  const valorImovel = parseBRNumber(settings.goal_valor_imovel) || 0;
  const pctEntrada = parseBRNumber(settings.goal_pct_entrada) || 20;
  const valorInicial = parseBRNumber(settings.goal_valor_inicial) || 0;
  const prazoMeses = settings.goal_prazo_meses ? parseInt(settings.goal_prazo_meses, 10) : null;

  const valorEntrada = round2((valorImovel * pctEntrada) / 100);
  const aportado = round2(transactions.filter(isGoalContribution).reduce((s, t) => s + Number(t.value), 0));
  const acumulado = round2(valorInicial + aportado);
  const faltante = round2(Math.max(0, valorEntrada - acumulado));
  const progressoPct = valorEntrada > 0 ? Math.min(100, round2((acumulado / valorEntrada) * 100)) : 0;

  const mediaMensal = mediaMensalAporte(transactions, todayISO, 6);
  const mesesParaAtingir = mediaMensal > 0 && faltante > 0 ? Math.ceil(faltante / mediaMensal) : faltante <= 0 ? 0 : null;
  const dataEstimada = mesesParaAtingir !== null ? addMonthsISO(todayISO, mesesParaAtingir) : null;
  const prazoAtingivel = prazoMeses && mesesParaAtingir !== null ? mesesParaAtingir <= prazoMeses : null;

  return {
    valorImovel, pctEntrada, valorEntrada, valorInicial, prazoMeses,
    acumulado, faltante, progressoPct, mediaMensal, mesesParaAtingir, dataEstimada, prazoAtingivel,
  };
}

export function computeGoalProjection(settings, transactions, todayISO, n = 12) {
  const metrics = computeGoalMetrics(settings, transactions, todayISO);
  const out = [];
  let acumulado = metrics.acumulado;
  for (let i = 0; i <= n; i++) {
    const mo = i === 0 ? todayISO.slice(0, 7) : addMonthsToBucket(todayISO.slice(0, 7), i);
    out.push({ month: mo, label: formatBucketLabel(mo), acumulado: round2(acumulado) });
    acumulado += metrics.mediaMensal;
  }
  return out;
}

// Índice de preparação (0-100): combina progresso da meta, ritmo de poupança, saúde das dívidas
// e reserva de emergência num único número, pra dar uma ideia geral de "quão perto você está".
export function computePreparationIndex({ progressoPct, mediaMensal, receitaMedia, comprometidoMes, saldoTotalContas, despesaMedia }) {
  const progressoScore = progressoPct; // já é 0-100

  const ritmoAlvo = receitaMedia > 0 ? (mediaMensal / receitaMedia) / 0.20 : 0; // meta implícita: 20% da renda
  const ritmoScore = Math.max(0, Math.min(100, round2(ritmoAlvo * 100)));

  const comprometidoPct = receitaMedia > 0 ? (comprometidoMes / receitaMedia) * 100 : 0;
  const dividasScore = Math.max(0, Math.min(100, round2(100 - comprometidoPct)));

  const reservaAlvo = despesaMedia > 0 ? saldoTotalContas / (despesaMedia * 3) : 0; // meta implícita: 3x a despesa mensal
  const reservaScore = Math.max(0, Math.min(100, round2(reservaAlvo * 100)));

  const total = Math.round(progressoScore * 0.4 + ritmoScore * 0.25 + dividasScore * 0.2 + reservaScore * 0.15);
  const label = total >= 70 ? "Preparado" : total >= 34 ? "Em progresso" : "Início";

  return {
    total: Math.max(0, Math.min(100, total)), label,
    componentes: [
      { key: "progresso", label: "Progresso da meta", score: Math.round(progressoScore), peso: 40 },
      { key: "ritmo", label: "Ritmo de poupança", score: Math.round(ritmoScore), peso: 25 },
      { key: "dividas", label: "Saúde das dívidas", score: Math.round(dividasScore), peso: 20 },
      { key: "reserva", label: "Reserva de emergência", score: Math.round(reservaScore), peso: 15 },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* EXPORTAR CSV                                                       */
/* ------------------------------------------------------------------ */
// Delimitador ; (não vírgula) e BOM UTF-8 — é o que o Excel em português espera pra abrir
// certinho, sem confundir separador decimal com separador de coluna e sem bagunçar acentos.

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function transactionsToCSV(transactions, accountsMap, categoriesList) {
  const header = ["Data", "Tipo", "Categoria", "Subcategoria", "Conta", "Forma de pagamento", "Observação", "Valor (R$)"];
  const catById = (id) => categoriesList.find((c) => c.id === id);
  const rows = transactions.map((t) => {
    const cat = catById(t.category_id);
    const account = accountsMap[t.account_id];
    return [
      formatDatePt(t.date),
      t.type === "receita" ? "Receita" : "Despesa",
      cat?.name || t.category_id,
      t.subcategory || "",
      account?.name || "—",
      t.payment_method || "",
      t.note || "",
      String(Number(t.value).toFixed(2)).replace(".", ","),
    ];
  });
  const lines = [header, ...rows].map((cols) => cols.map(csvEscape).join(";"));
  return lines.join("\r\n");
}

export function downloadCSV(csvContent, filename) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* ALERTAS                                                            */
/* ------------------------------------------------------------------ */

function daysUntilNextOccurrence(todayISO, dayOfMonth) {
  const [y, m, d] = todayISO.split("-").map(Number);
  let candidate;
  if (d <= dayOfMonth) {
    const lastDay = new Date(y, m, 0).getDate();
    candidate = new Date(y, m - 1, Math.min(dayOfMonth, lastDay));
  } else {
    const nextMonthFirst = new Date(y, m, 1);
    const lastDay = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth() + 1, 0).getDate();
    candidate = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth(), Math.min(dayOfMonth, lastDay));
  }
  const today = new Date(y, m - 1, d);
  return Math.round((candidate - today) / 86400000);
}

export function daysBetweenISO(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  return Math.round((new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd)) / 86400000);
}

function diasLabel(n) {
  if (n <= 0) return "hoje";
  if (n === 1) return "1 dia";
  return `${n} dias`;
}

function fraseVencimento(prefixo, dias) {
  return dias <= 0 ? `${prefixo} hoje` : `${prefixo} em ${diasLabel(dias)}`;
}

// Junta 3 tipos de alerta: fatura de cartão perto de vencer, grupo do orçamento 50/30/20
// estourando, e parcela de dívida perto de vencer. "diasAntecedencia" controla a janela de aviso.
export function computeAlerts({ accounts, transactions, debts, settings, todayISO, diasAntecedencia = 5 }) {
  const alerts = [];
  const accountsMap = accountsToMap(accounts);

  for (const acc of accounts) {
    if (acc.type !== "cartao" || !acc.dia_vencimento) continue;
    const dias = daysUntilNextOccurrence(todayISO, Number(acc.dia_vencimento));
    if (dias <= diasAntecedencia) {
      const severidade = dias <= 1 ? "alta" : "media";
      alerts.push({
        id: `fatura-${acc.id}`, signature: `fatura-${acc.id}-${severidade}`,
        tipo: "fatura", severidade,
        titulo: fraseVencimento(`Fatura do ${acc.name} vence`, dias),
        href: "/dashboard/contas",
      });
    }
  }

  if (settings) {
    const monthISO = todayISO.slice(0, 7);
    let receitas = 0;
    for (const t of transactions) {
      if (t.type === "receita" && getEffectiveMonth(t, accountsMap) === monthISO) receitas += Number(t.value);
    }
    const groups = computeBudgetGroups(transactions, accountsMap, monthISO, receitas, settings);
    for (const g of groups) {
      if (g.usoPct >= 90) {
        const severidade = g.usoPct >= 100 ? "alta" : "media";
        alerts.push({
          id: `orcamento-${g.group}`, signature: `orcamento-${g.group}-${severidade}-${monthISO}`,
          tipo: "orcamento", severidade,
          titulo: `${GROUP_LABELS[g.group]} já usou ${g.usoPct}% do orçamento do mês`,
          href: "/dashboard",
        });
      }
    }
  }

  for (const d of debts) {
    const st = computeDebtStatus(d, todayISO);
    if (st.quitada || !st.proximoVencimento) continue;
    const dias = daysBetweenISO(todayISO, st.proximoVencimento);
    if (dias >= 0 && dias <= diasAntecedencia) {
      const severidade = dias <= 1 ? "alta" : "media";
      alerts.push({
        id: `divida-${d.id}`, signature: `divida-${d.id}-${severidade}`,
        tipo: "divida", severidade,
        titulo: fraseVencimento(`Parcela de "${d.nome}" vence`, dias),
        href: "/dashboard/dividas",
      });
    }
  }

  // A assinatura inclui os IDs dos lançamentos específicos — se algum for revisado (some da
  // lista) ou um novo chegar, a assinatura muda e o alerta volta a contar como "não visto",
  // mesmo que o texto genérico do card continue parecido.
  const pendentes = transactions.filter((t) => t.needs_review);
  if (pendentes.length > 0) {
    const idsPendentes = pendentes.map((t) => t.id).sort();
    alerts.push({
      id: "revisao-pendente", signature: `revisao-${idsPendentes.join(",")}`,
      tipo: "revisao", severidade: "media",
      titulo: `${pendentes.length} lançamento(s) importado(s) automaticamente aguardando revisão`,
      href: `/dashboard/lancamentos?review=${idsPendentes.join(",")}`,
    });
  }

  return alerts.sort((a, b) => (a.severidade === "alta" ? 0 : 1) - (b.severidade === "alta" ? 0 : 1));
}

/* ------------------------------------------------------------------ */
/* IMPORTAÇÃO DE TRANSAÇÕES DO BANCO (PLUGGY)                         */
/* ------------------------------------------------------------------ */
// Transforma uma transação da Pluggy num rascunho no nosso formato. A categoria sugerida é
// sempre genérica de propósito — o banco não sabe se "Ifood" é Alimentação ou Lazer pra cada
// família, então a pessoa confirma/ajusta na tela de revisão antes de qualquer coisa ser salva.
export function mapPluggyTransactionToDraft(pluggyTx, accountId) {
  const isReceita = pluggyTx.type === "CREDIT";
  return {
    externalId: pluggyTx.id,
    type: isReceita ? "receita" : "despesa",
    value: round2(Math.abs(pluggyTx.amount)),
    date: pluggyTx.date.slice(0, 10),
    note: pluggyTx.description || "",
    accountId,
    categoryId: isReceita ? "renda" : "outros",
    subcategory: isReceita ? "Outros" : "Diversos",
    paymentMethod: "Importado do banco",
  };
}

// Dado o que já veio da Pluggy e o que já existe no nosso banco (com external_id preenchido),
// devolve só as transações realmente NOVAS — pra não importar a mesma coisa duas vezes numa
// próxima sincronização.
export function filterNewPluggyTransactions(pluggyTransactions, existingExternalIds) {
  const seen = new Set(existingExternalIds);
  return pluggyTransactions.filter((t) => !seen.has(t.id));
}

// Procura, entre lançamentos digitados à mão (sem external_id) da MESMA conta, algum que pareça
// ser a mesma compra que já veio do banco — mesmo valor, mesmo tipo, data a até 3 dias de distância.
// Não decide sozinho o que fazer; só sinaliza pra pessoa confirmar na revisão.
export function findPossibleDuplicate(draft, manualTransactions, janelaDias = 3) {
  for (const t of manualTransactions) {
    if (t.account_id !== draft.accountId) continue;
    if (t.type !== draft.type) continue;
    if (round2(Number(t.value)) !== round2(draft.value)) continue;
    if (Math.abs(daysBetweenISO(t.date, draft.date)) <= janelaDias) {
      return { id: t.id, note: t.note, date: t.date };
    }
  }
  return null;
}

