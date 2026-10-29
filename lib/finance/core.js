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
  // Quem já é número (vindo do banco, por exemplo) nunca é reinterpretado como texto: sem isso,
  // 2.125 viraria 2125 por parecer um separador de milhar.
  if (typeof input === "number") return Number.isFinite(input) ? input : NaN;
  let s = String(input).trim();
  if (!s) return NaN;
  s = s.replace(/[^\d,.\-]/g, "");
  s = s.replace(/\.(?=\d{3}(\D|$))/g, "");
  s = s.replace(",", ".");
  return parseFloat(s);
}

// Número seguro para cálculo: aceita número ou texto digitado ("1.500,50") e nunca devolve NaN.
export function num(value, fallback = 0) {
  const n = parseBRNumber(value);
  return Number.isFinite(n) ? n : fallback;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Monta uma data válida: se o dia não existe no mês (31/02, dia 31 em abril), usa o último dia do mês.
function clampedISODate(year, month, day) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad2(month)}-${pad2(Math.min(Math.max(day, 1), last))}`;
}

// "now" pode ser passado só para teste; no uso normal é a data de agora.
export function parseNaturalLanguage(rawText, accounts, now = new Date()) {
  const text = removeAccents(rawText.toLowerCase());
  const today = toISODate(now);

  let value = null;
  // Valor com milhar ("1.500" ou "1.500,00"), com centavos ("42,90" ou "42.90") ou inteiro ("500").
  const MONEY = "\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?";
  let m = text.match(new RegExp(`r\\$\\s*(${MONEY})`));
  if (!m) m = text.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
  if (!m) m = text.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)\s*(?:reais|conto|pila)\b/);
  if (m) {
    const parsed = parseBRNumber(m[1]);
    value = Number.isFinite(parsed) ? parsed : null;
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
      const [, dd, mm, yy] = dm;
      const month = parseInt(mm, 10);
      const year = yy ? parseInt(yy.length === 2 ? "20" + yy : yy, 10) : now.getFullYear();
      if (month >= 1 && month <= 12) date = clampedISODate(year, month, parseInt(dd, 10));
    } else {
      const diaMatch = text.match(/\bdia (\d{1,2})\b/);
      if (diaMatch) date = clampedISODate(now.getFullYear(), now.getMonth() + 1, parseInt(diaMatch[1], 10));
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
  let bal = num(account.saldo_inicial);
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
    if (t.account_id === card.id && t.type === "despesa" && !isStatementCarryover(t)) {
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

// Data de vencimento da fatura de um mês de fechamento. Se o vencimento é depois do fechamento
// (ex.: fecha dia 5, vence dia 15) cai no mesmo mês; senão (fecha 25, vence 5) cai no mês seguinte.
export function invoiceDueDate(bucket, diaFechamento, diaVencimento) {
  const [y, m] = bucket.split("-").map(Number);
  const offset = diaVencimento > diaFechamento ? 0 : 1;
  const total = y * 12 + (m - 1) + offset;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  return clampedISODate(ny, nm, diaVencimento);
}

// Quanto do limite do cartão está comprometido. Conta a fatura que já fechou e ainda não venceu,
// a fatura aberta e todas as parcelas futuras. Fatura vencida há mais de um dia conta como paga
// (o app não tem botão de "paguei a fatura", então a data de vencimento decide).
export function computeCardLimitUsage(card, transactions, todayISO) {
  const diaFechamento = num(card.dia_fechamento, 25) || 25;
  const diaVencimento = num(card.dia_vencimento, 5) || 5;
  const totals = {};
  for (const t of transactions) {
    if (t.account_id === card.id && t.type === "despesa" && !isStatementCarryover(t)) {
      const b = resolveInvoiceBucket(t, diaFechamento);
      totals[b] = round2((totals[b] || 0) + Number(t.value));
    }
  }
  const atualBucket = invoiceBucketFromDate(todayISO, diaFechamento);
  const proximoBucket = nextBucket(atualBucket);
  let faturaFechada = 0, faturaAtual = 0, futuras = 0;
  for (const [bucket, total] of Object.entries(totals)) {
    if (bucket < atualBucket) {
      if (invoiceDueDate(bucket, diaFechamento, diaVencimento) >= todayISO) faturaFechada += total;
    } else if (bucket === atualBucket) {
      faturaAtual += total;
    } else {
      futuras += total;
    }
  }
  faturaFechada = round2(faturaFechada);
  faturaAtual = round2(faturaAtual);
  futuras = round2(futuras);
  const proximaFatura = totals[proximoBucket] || 0;
  const limite = num(card.limite);
  const emAberto = round2(faturaFechada + faturaAtual + futuras);
  return {
    atualBucket, proximoBucket, faturaFechada, faturaAtual, proximaFatura,
    demaisFuturas: round2(futuras - proximaFatura), futuras, emAberto, limite,
    disponivel: round2(limite - emAberto),
    usoPct: limite > 0 ? Math.min(100, Math.round((emAberto / limite) * 100)) : 0,
  };
}

// Próxima fatura a vencer de cada cartão (a primeira, a partir de hoje, que tem valor). Serve para
// mostrar "o que vence e quando" logo na Visão Geral. Fatura já vencida conta como paga, igual ao
// cálculo do limite, porque o app não tem botão de "paguei".
export function computeUpcomingInvoices(accounts, transactions, todayISO) {
  const out = [];
  for (const card of accounts) {
    if (card.type !== "cartao") continue;
    const diaFechamento = num(card.dia_fechamento, 25) || 25;
    const diaVencimento = num(card.dia_vencimento, 5) || 5;
    const totals = {};
    for (const t of transactions) {
      if (t.account_id === card.id && t.type === "despesa" && !isStatementCarryover(t)) {
        const b = resolveInvoiceBucket(t, diaFechamento);
        totals[b] = round2((totals[b] || 0) + Number(t.value));
      }
    }
    const atualBucket = invoiceBucketFromDate(todayISO, diaFechamento);
    const proximo = Object.keys(totals).sort()
      .map((bucket) => ({ bucket, valor: totals[bucket], vencimento: invoiceDueDate(bucket, diaFechamento, diaVencimento) }))
      .find((x) => x.valor > 0 && x.vencimento >= todayISO);
    if (!proximo) continue;
    out.push({
      cardId: card.id, nome: card.name, bucket: proximo.bucket, valor: proximo.valor, vencimento: proximo.vencimento,
      status: proximo.bucket < atualBucket ? "fechada" : "aberta",
      dias: daysBetweenISO(todayISO, proximo.vencimento),
    });
  }
  return out.sort((a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : 0));
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

/* ------------------------------------------------------------------ */
/* PAGAMENTO DE FATURA NÃO É RECEITA NEM DESPESA                       */
/* ------------------------------------------------------------------ */
// Pagar a fatura move dinheiro da conta para o cartão. Não é renda e não é um gasto novo (o gasto
// já foi contado na compra). O banco informa isso de dois jeitos, e os dois entram nas contas
// de fluxo (receitas, despesas, categorias e orçamento) como "pagamento de fatura", ficando de fora:
//  1) o crédito na conta do cartão (type "receita" em conta do tipo cartão);
//  2) o débito na conta corrente que pagou a fatura, quando existe um crédito de cartão com o
//     mesmo valor em até 3 dias e a descrição parece pagamento (boleto, fatura, cartão).
// Nada é apagado nem alterado no banco; o saldo das contas continua usando todos os lançamentos.
const PALAVRAS_PAGAMENTO = /(pagamento|pgto|pag\.|boleto|fatura|cart[aã]o|cartoes|cart[oõ]es)/i;

// Rendimento pago ("REND PAGO") é receita de verdade e fica de fora desta regra.
export function isInternalMovementNote(note) {
  const n = String(note || "");
  if (/REND(IMENTO)?S?\s+PAGO/i.test(n)) return false;
  return /\b(RES|APL)\s+APLIC\s+AUT/i.test(n) || /^\s*(RESGATE|APLICA[CÇ][AÃ]O)\b/i.test(n) || /CR[EÉ]DITO\s+LIBERADO\s+PARA\s+PIX/i.test(n);
}

// Linha que o banco coloca na fatura repetindo o total da fatura anterior. Não é compra nova.
export function isStatementCarryover(t) {
  return /TOTAL\s+DA\s+FATURA\s+ANTERIOR|SALDO\s+FATURA\s+ANTERIOR/i.test(String(t.note || ""));
}

const PAGAMENTO_DE_FATURA_NOTE = /PAGAMENTO\s+DE\s+FATURA|FATURA\s+PAGA|PGTO\s+MIN|PAGAMENTO\s+DE\s+BOLETO\s+CART/i;

export function cardPaymentIds(transactions, accountsMap) {
  const ids = new Set();
  // Cartões que realmente têm lançamentos importados, pelo primeiro nome ("ITAU", "CAIXA", "NUBANK").
  // Se o cartão citado no pagamento não tem lançamentos (ex.: BRB), o pagamento é o único registro
  // desse gasto, então continua contando como despesa.
  const cartoesComDados = new Set();
  for (const t of transactions) {
    const acc = accountsMap[t.account_id];
    if (acc && acc.type === "cartao") {
      const primeiro = stripAccentsUpper(acc.name).replace(/[^A-Z ]/g, " ").trim().split(/\s+/)[0];
      if (primeiro) cartoesComDados.add(primeiro);
    }
  }
  for (const t of transactions) {
    const acc = accountsMap[t.account_id];
    if (!acc) continue;
    if (acc.type === "cartao" && t.type === "despesa" && isStatementCarryover(t)) ids.add(t.id);
    if (acc.type !== "cartao" && t.type === "despesa" && PAGAMENTO_DE_FATURA_NOTE.test(String(t.note || ""))) {
      const texto = stripAccentsUpper(t.note);
      for (const nome of cartoesComDados) {
        if (new RegExp(`\\b${nome}\\b`).test(texto)) { ids.add(t.id); break; }
      }
    }
  }
  const creditosPorCentavos = new Map();
  for (const t of transactions) {
    const acc = accountsMap[t.account_id];
    if (acc && acc.type === "cartao" && t.type === "receita") {
      ids.add(t.id);
      const key = Math.round(Number(t.value) * 100);
      if (!creditosPorCentavos.has(key)) creditosPorCentavos.set(key, []);
      creditosPorCentavos.get(key).push(t.date);
    }
  }
  // Movimentação interna da própria conta (resgate e aplicação automática, crédito do banco para Pix)
  // também não é receita nem despesa.
  for (const t of transactions) {
    const acc = accountsMap[t.account_id];
    if (acc && acc.type !== "cartao" && isInternalMovementNote(t.note)) ids.add(t.id);
  }
  if (creditosPorCentavos.size === 0) return ids;
  for (const t of transactions) {
    const acc = accountsMap[t.account_id];
    if (!acc || acc.type === "cartao" || t.type !== "despesa") continue;
    if (!PALAVRAS_PAGAMENTO.test(t.note || "")) continue;
    const datas = creditosPorCentavos.get(Math.round(Number(t.value) * 100));
    if (datas && datas.some((d) => Math.abs(daysBetweenISO(d, t.date)) <= 3)) ids.add(t.id);
  }
  return ids;
}

export function isCardPayment(t, paymentIds) {
  return paymentIds.has(t.id);
}

// Lista só com o que é receita ou despesa de verdade, para somar fluxo.
export function excludeCardPayments(transactions, accountsMap) {
  const ids = cardPaymentIds(transactions, accountsMap);
  return ids.size === 0 ? transactions : transactions.filter((t) => !ids.has(t.id));
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
  const fluxo = excludeCardPayments(transactions, accountsMap);
  return lastNMonthBuckets(endMonthISO, n).map((mo) => {
    let receitas = 0, despesas = 0;
    for (const t of fluxo) {
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
  for (const t of excludeCardPayments(transactions, accountsMap)) {
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
    if (t.account_id === card.id && t.type === "despesa" && !isStatementCarryover(t)) {
      const b = resolveInvoiceBucket(t, diaFechamento);
      totals[b] = round2((totals[b] || 0) + Number(t.value));
    }
  }
  return lastNMonthBuckets(endBucketISO, n).map((b) => ({
    bucket: b, label: MONTH_NAMES[parseInt(b.split("-")[1], 10) - 1].slice(0, 3), total: totals[b] || 0,
  }));
}

// Parcelas de dívida que ainda vão sair da conta até o fim do mês atual. A parcela que já venceu
// (inclusive a de hoje) já foi descontada do saldo, então não pode contar de novo como "comprometida".
export function computeDebtsCommittedRestOfMonth(debts, todayISO) {
  let total = 0;
  for (const d of debts) {
    const st = computeDebtStatus(d, todayISO);
    if (st.quitada || !st.proximoVencimento) continue;
    if (st.proximoVencimento.slice(0, 7) === todayISO.slice(0, 7)) total += num(d.parcela);
  }
  return round2(total);
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
  for (const t of excludeCardPayments(transactions, accountsMap)) {
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

// Só conta como guardado o aporte que já aconteceu. Recorrências são lançadas 12 meses à frente,
// e esses meses futuros ainda não têm dinheiro guardado.
function isRealizedGoalContribution(t, todayISO) {
  return isGoalContribution(t) && t.date <= todayISO;
}

// Média mensal aportada nos últimos N meses (olha só meses que já têm lançamento, pra não puxar a
// média pra baixo por causa de meses futuros ou muito antigos sem nada).
function mediaMensalAporte(transactions, todayISO, n = 6) {
  const buckets = lastNMonthBuckets(todayISO.slice(0, 7), n);
  const porMes = {};
  for (const t of transactions) {
    if (!isRealizedGoalContribution(t, todayISO)) continue;
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
  const aportado = round2(transactions.filter((t) => isRealizedGoalContribution(t, todayISO)).reduce((s, t) => s + Number(t.value), 0));
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
    for (const t of excludeCardPayments(transactions, accountsMap)) {
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

// Compara o saldo que CALCULAMOS (soma dos lançamentos) com o último saldo real que a Pluggy
// informou pra essa conta. Uma diferença relevante é sinal de algo que escapou — lançamento
// faltando, duplicado, ou apagado por engano. Tolerância pequena pra não incomodar por
// centavos de arredondamento.
const TOLERANCIA_RECONCILIACAO = 1;
  for (const acc of accounts) {
    if (acc.type !== "conta" || acc.pluggy_balance == null) continue;
    const calculado = computeAccountBalance(acc, transactions, todayISO);
    const diferenca = round2(calculado - Number(acc.pluggy_balance));
    if (Math.abs(diferenca) >= TOLERANCIA_RECONCILIACAO) {
      alerts.push({
        id: `reconciliacao-${acc.id}`, signature: `reconciliacao-${acc.id}-${diferenca}`,
        tipo: "reconciliacao", severidade: Math.abs(diferenca) >= 100 ? "alta" : "media",
        titulo: `${acc.name}: saldo calculado difere do saldo real do banco em ${formatBRL(Math.abs(diferenca))}`,
        href: "/dashboard/contas",
      });
    }
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
  const sugestao = isReceita ? null : suggestFromMerchants(pluggyTx.description);
  return {
    externalId: pluggyTx.id,
    type: isReceita ? "receita" : "despesa",
    value: round2(Math.abs(pluggyTx.amount)),
    date: pluggyTx.date.slice(0, 10),
    note: pluggyTx.description || "",
    accountId,
    categoryId: isReceita ? "renda" : (sugestao?.categoryId || "outros"),
    subcategory: isReceita ? "Outros" : (sugestao?.subcategory || "Diversos"),
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

/* ------------------------------------------------------------------ */
/* CATEGORIZAÇÃO AUTOMÁTICA                                            */
/* ------------------------------------------------------------------ */
// Lojas e serviços comuns no Brasil, procurados como palavras inteiras na descrição. As frases
// mais longas vêm primeiro ("mercado livre" antes de "mercado"). Só valem para despesas.
const MERCHANT_RULES = [
  ["mercado livre", "compras", "Diversos"], ["mercadolivre", "compras", "Diversos"], ["shopee", "compras", "Diversos"],
  ["amazon prime", "lazer", "Streaming"], ["amazon", "compras", "Diversos"], ["magalu", "compras", "Eletrônicos"],
  ["americanas", "compras", "Diversos"], ["shein", "compras", "Roupas"], ["renner", "compras", "Roupas"], ["riachuelo", "compras", "Roupas"],
  ["ifood", "alimentacao", "Delivery"], ["rappi", "alimentacao", "Delivery"], ["mcdonalds", "alimentacao", "Restaurante"],
  ["burger king", "alimentacao", "Restaurante"], ["subway", "alimentacao", "Restaurante"], ["padaria", "alimentacao", "Padaria"],
  ["supermercado", "alimentacao", "Mercado"], ["mercado", "alimentacao", "Mercado"], ["market", "alimentacao", "Mercado"], ["atacadao", "alimentacao", "Mercado"], ["assai", "alimentacao", "Mercado"],
  ["carrefour", "alimentacao", "Mercado"], ["guanabara", "alimentacao", "Mercado"], ["prezunic", "alimentacao", "Mercado"],
  ["hortifruti", "alimentacao", "Mercado"], ["restaurante", "alimentacao", "Restaurante"], ["lanchonete", "alimentacao", "Restaurante"],
  ["uber", "transporte", "App de transporte"], ["99 pop", "transporte", "App de transporte"], ["99app", "transporte", "App de transporte"],
  ["posto", "transporte", "Combustível"], ["shell", "transporte", "Combustível"], ["ipiranga", "transporte", "Combustível"],
  ["estacionamento", "transporte", "Estacionamento"], ["sem parar", "transporte", "Estacionamento"], ["bilhete unico", "transporte", "Transporte público"],
  ["riocard", "transporte", "Transporte público"], ["drogasil", "saude", "Farmácia"], ["drogaria", "saude", "Farmácia"],
  ["farmacia", "saude", "Farmácia"], ["pague menos", "saude", "Farmácia"], ["raia", "saude", "Farmácia"], ["pacheco", "saude", "Farmácia"],
  ["unimed", "saude", "Plano de saúde"], ["leve saude", "saude", "Plano de saúde"], ["academia", "saude", "Academia"],
  ["netflix", "lazer", "Streaming"], ["spotify", "lazer", "Streaming"], ["disney", "lazer", "Streaming"], ["youtube", "lazer", "Streaming"],
  ["hbo", "lazer", "Streaming"], ["cinema", "lazer", "Cinema"], ["ingresso", "lazer", "Ingressos"],
  ["ceg", "moradia", "Gás"], ["light", "moradia", "Luz"], ["enel", "moradia", "Luz"], ["cedae", "moradia", "Água"],
  ["condominio", "moradia", "Condomínio"], ["aluguel", "moradia", "Aluguel"], ["iptu", "moradia", "IPTU"],
  ["claro", "moradia", "Internet"], ["vivo", "moradia", "Internet"], ["internet", "moradia", "Internet"],
  ["alliance net", "moradia", "Internet"], ["banda larga", "moradia", "Internet"], ["anhanguera", "educacao", "Mensalidade"], ["curso", "educacao", "Curso"], ["faculdade", "educacao", "Mensalidade"],
];

function stripAccentsUpper(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// Palavras de "ruído" que o banco coloca na frente da descrição e que não dizem quem recebeu ou vendeu.
const NOISE = new Set(["PIX", "ENVIADO", "RECEBIDO", "PAGAMENTO", "PAGTO", "PGTO", "DE", "DO", "DA", "QR", "CODE", "SAIDA", "ENTRADA", "COMPRA", "DEBITO", "CREDITO", "TRANSFERENCIA", "TED", "DOC", "NO", "NA", "PARA", "COM"]);

// "Pix enviado ANDRESSA DE FREITAS LOBO" e "Pagamento de Pix QR Code ANDRESSA DE FREITAS" têm o mesmo
// núcleo, e é por ele que lançamentos parecidos são agrupados. Vazio quando só sobra ruído.
export function descriptionCore(note) {
  const tokens = stripAccentsUpper(note).replace(/[0-9]/g, " ").replace(/[^A-Z ]/g, " ").split(/\s+/).filter((w) => w && !NOISE.has(w));
  return tokens.slice(0, 4).join(" ");
}

// Marcas com nome distintivo, procuradas como trecho mesmo quando o banco cola as palavras
// ("DL *UberRidesSao Paulo", "APPLE.COM/BILL").
const BRAND_FRAGMENTS = [
  ["UBER", "transporte", "App de transporte"], ["99APP", "transporte", "App de transporte"], ["99 RIDE", "transporte", "App de transporte"],
  ["APPLE COM", "lazer", "Streaming"], ["NETFLIX", "lazer", "Streaming"], ["SPOTIFY", "lazer", "Streaming"], ["IFOOD", "alimentacao", "Delivery"],
  ["MERCADOLIVRE", "compras", "Diversos"], ["SHOPEE", "compras", "Diversos"], ["DROGARIA", "saude", "Farmácia"], ["DROGASIL", "saude", "Farmácia"],
  ["HORTIFRUT", "alimentacao", "Mercado"], ["PAO QUENTE", "alimentacao", "Padaria"], ["CHURRASQUEIRA", "alimentacao", "Restaurante"],
];

export function suggestFromMerchants(note) {
  const text = ` ${stripAccentsUpper(note).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  for (const [kw, categoryId, subcategory] of MERCHANT_RULES) {
    if (text.includes(` ${kw.toUpperCase()} `)) return { categoryId, subcategory };
  }
  const colado = text.replace(/\s+/g, " ");
  for (const [frag, categoryId, subcategory] of BRAND_FRAGMENTS) {
    if (colado.includes(frag)) return { categoryId, subcategory };
  }
  return null;
}

// Aprende com o que a pessoa já categorizou à mão: núcleo da descrição -> categoria mais usada.
// Só entram lançamentos fora de "Outros" e que não estão aguardando revisão.
export function buildCategoryRules(transactions) {
  const counts = new Map();
  for (const t of transactions) {
    if (t.needs_review || !t.category_id || t.category_id === "outros" || t.category_id === "renda") continue;
    const core = descriptionCore(t.note);
    if (!core) continue;
    const key = `${t.type}|${core}`;
    const bucket = counts.get(key) || new Map();
    const catKey = `${t.category_id}|${t.subcategory || ""}`;
    bucket.set(catKey, (bucket.get(catKey) || 0) + 1);
    counts.set(key, bucket);
  }
  const rules = new Map();
  for (const [key, bucket] of counts) {
    const [best] = [...bucket.entries()].sort((a, b) => b[1] - a[1]);
    const [categoryId, subcategory] = best[0].split("|");
    rules.set(key, { categoryId, subcategory: subcategory || null, vezes: best[1] });
  }
  return rules;
}

// Monta o plano de categorização: quais lançamentos mudariam e para quê, agrupados por descrição.
// Não grava nada. Só mexe em despesas em "Outros" ou aguardando revisão, e nunca em pagamento de fatura
// ou movimentação interna.
export function planAutoCategorization(transactions, accountsMap) {
  const ignorados = cardPaymentIds(transactions, accountsMap);
  const rules = buildCategoryRules(transactions);
  const groups = new Map();
  for (const t of transactions) {
    if (ignorados.has(t.id)) continue;
    if (t.type !== "despesa") continue;
    if (!(t.category_id === "outros" || t.needs_review)) continue;
    const core = descriptionCore(t.note);
    let sug = null, origem = null;
    const learned = core ? rules.get(`${t.type}|${core}`) : null;
    if (learned) { sug = learned; origem = "seu histórico"; }
    else {
      const m = suggestFromMerchants(t.note);
      if (m) { sug = m; origem = "nome do estabelecimento"; }
    }
    if (!sug || sug.categoryId === t.category_id && !t.needs_review) continue;
    const key = `${core || t.note}|${sug.categoryId}|${sug.subcategory || ""}`;
    const g = groups.get(key) || { descricao: core || t.note, categoryId: sug.categoryId, subcategory: sug.subcategory, origem, ids: [], total: 0 };
    g.ids.push(t.id);
    g.total = round2(g.total + Number(t.value));
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.ids.length - a.ids.length);
}

// Para "aplicar a todos os parecidos": ids de despesas ainda em "Outros" ou em revisão com o mesmo núcleo.
export function findSimilarUncategorized(transactions, accountsMap, reference) {
  const core = descriptionCore(reference.note);
  if (!core) return [];
  const ignorados = cardPaymentIds(transactions, accountsMap);
  return transactions
    .filter((t) => t.id !== reference.id && t.type === reference.type && !ignorados.has(t.id) &&
      (t.category_id === "outros" || t.needs_review) && descriptionCore(t.note) === core)
    .map((t) => t.id);
}

/* ------------------------------------------------------------------ */
/* ASSINATURAS E RECORRÊNCIAS                                         */
/* ------------------------------------------------------------------ */
// Reduz uma descrição de lançamento a um "núcleo" comparável — maiúsculas, sem números nem
// pontuação, sem espaços duplos. "NETFLIX.COM 08/26" e "NETFLIX.COM 09/26" viram a mesma chave.
function normalizeDescription(note) {
  if (!note) return "";
  return note
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acento
    .replace(/[0-9]/g, "")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Procura, no histórico, despesas que se repetem com um intervalo parecido com mensal (25 a 35
// dias entre uma ocorrência e a próxima), na mesma conta, com descrição parecida — candidatos a
// assinatura/recorrência. Avisa também se o valor mudou entre a penúltima e a última ocorrência.
export function detectRecurringCharges(transactions, { minOcorrencias = 2, minDias = 25, maxDias = 35 } = {}) {
  const despesas = transactions.filter((t) =>
    t.type === "despesa" && t.note && t.note.trim() &&
    !t.installment_total && // exclui parcelamento de cartão (parcelas têm intervalo parecido, mas não são assinatura)
    t.group_type !== "divida" // exclui parcela de dívida/financiamento, pelo mesmo motivo
  );
  const grupos = {};
  for (const t of despesas) {
    const nucleo = normalizeDescription(t.note);
    if (nucleo.length < 3) continue; // descrição curta demais pra confiar (ex: "x", "-- ")
    const chave = `${t.account_id}|${nucleo}`;
    (grupos[chave] = grupos[chave] || []).push(t);
  }

  const recorrencias = [];
  for (const [chave, txs] of Object.entries(grupos)) {
    if (txs.length < minOcorrencias) continue;
    const ordenados = [...txs].sort((a, b) => a.date.localeCompare(b.date));

    const intervalos = [];
    for (let i = 1; i < ordenados.length; i++) {
      intervalos.push(daysBetweenISO(ordenados[i - 1].date, ordenados[i].date));
    }
    const consistente = intervalos.every((d) => d >= minDias && d <= maxDias);
    if (!consistente) continue;

    const ultima = ordenados[ordenados.length - 1];
    const penultima = ordenados.length >= 2 ? ordenados[ordenados.length - 2] : null;
    const valorAtual = round2(Number(ultima.value));
    const valorAnterior = penultima ? round2(Number(penultima.value)) : null;
    const valorMudou = penultima !== null && valorAtual !== valorAnterior;

    const mediaIntervalo = Math.round(intervalos.reduce((s, d) => s + d, 0) / intervalos.length);

    recorrencias.push({
      chave,
      descricao: ultima.note,
      accountId: ultima.account_id,
      categoryId: ultima.category_id,
      valorAtual,
      valorAnterior,
      valorMudou,
      ocorrencias: ordenados.length,
      ultimaData: ultima.date,
      proximaDataEstimada: addDaysISO(ultima.date, mediaIntervalo),
    });
  }

  return recorrencias.sort((a, b) => b.valorAtual - a.valorAtual);
}


/* ------------------------------------------------------------------ */
/* GERAÇÃO DE PARCELAS, RECORRÊNCIAS E DÍVIDAS                        */
/* ------------------------------------------------------------------ */

// Gera as ocorrências de um lançamento (parcelas ou recorrência) já no formato de linhas do banco.
// "account" é opcional — quando é um cartão, toda ocorrência já sai marcada com a fatura certa
// (invoice_bucket), calculada a partir da data ORIGINAL da compra — nunca de uma data já deslocada,
// pra não deslocar duas vezes.
export function buildOccurrences(base, account) {
  const rows = [];
  const groupId = crypto.randomUUID();
  const isCard = account && account.type === "cartao";
  const diaFechamento = isCard ? Number(account.dia_fechamento) || 25 : null;

  if (base.installment && base.installment_total > 1) {
    const n = base.installment_total;
    const per = round2(base.value / n);
    const remainder = round2(base.value - per * n);

    let startDate = base.date;
    let firstBucket = null;
    if (isCard) {
      const [, , purchaseDay] = base.date.split("-").map(Number);
      const offset = purchaseDay <= diaFechamento ? 0 : 1;
      startDate = addMonthsISO(base.date, offset);
      firstBucket = invoiceBucketFromDate(base.date, diaFechamento);
    }

    for (let i = 0; i < n; i++) {
      rows.push({
        ...base,
        date: addMonthsISO(startDate, i),
        ...(firstBucket ? { invoice_bucket: addMonthsToBucket(firstBucket, i) } : {}),
        value: i === n - 1 ? round2(per + remainder) : per,
        installment_current: i + 1,
        installment_total: n,
        group_id: groupId,
        group_type: "parcelamento",
        note: base.note ? `${base.note} (${i + 1}/${n})` : `Parcela ${i + 1}/${n}`,
      });
    }
  } else if (base.recurrence && base.recurrence !== "nenhuma") {
    const stepFn = base.recurrence === "mensal" ? addMonthsISO : base.recurrence === "semanal" ? addDaysISO : addYearsISO;
    const count = base.recurrence === "mensal" ? 12 : base.recurrence === "semanal" ? 12 : 3;
    for (let i = 0; i < count; i++) {
      const occDate = base.recurrence === "semanal" ? addDaysISO(base.date, i * 7) : stepFn(base.date, i);
      rows.push({
        ...base,
        date: occDate,
        ...(isCard ? { invoice_bucket: invoiceBucketFromDate(occDate, diaFechamento) } : {}),
        group_id: groupId,
        group_type: "recorrencia",
      });
    }
  } else {
    rows.push({
      ...base,
      ...(isCard ? { invoice_bucket: invoiceBucketFromDate(base.date, diaFechamento) } : {}),
    });
  }
  return rows;
}

// Uma despesa por parcela da dívida, sempre no mesmo dia do mês da 1ª parcela (ou no último dia
// do mês, quando o mês é mais curto).
export function buildDebtTransactionRows(debt, householdId, groupId) {
  const total = Number(debt.total_parcelas) || 0;
  const parcela = round2(Number(debt.parcela) || 0);
  const rows = [];
  for (let i = 0; i < total; i++) {
    rows.push({
      household_id: householdId,
      type: "despesa",
      value: parcela,
      date: addMonthsISO(debt.data_primeira_parcela, i),
      category_id: "futuro",
      subcategory: "Pagamento de dívida",
      account_id: debt.conta_id,
      payment_method: "Transferência",
      installment: true,
      installment_current: i + 1,
      installment_total: total,
      group_id: groupId,
      group_type: "divida",
      note: debt.nome ? `${debt.nome} (${i + 1}/${total})` : `Parcela ${i + 1}/${total}`,
      source: "divida",
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* EDIÇÃO DE LANÇAMENTO                                               */
/* ------------------------------------------------------------------ */
// Devolve só o que a edição realmente muda. Não mexe em parcelamento, recorrência, origem
// (manual, banco) nem vínculos de grupo, e mantém a fatura do cartão coerente com a nova data/conta.
export function buildTransactionEditPatch(fields, account, original) {
  const patch = {
    type: fields.type,
    value: round2(fields.value),
    date: fields.date,
    category_id: fields.category_id,
    subcategory: fields.subcategory,
    account_id: fields.account_id,
    payment_method: fields.payment_method,
    note: fields.note,
    needs_review: false, // quem editou conferiu o lançamento
  };

  if (account && account.type === "cartao") {
    const diaFechamento = Number(account.dia_fechamento) || 25;
    const ehParcela = original.group_type === "parcelamento" && original.invoice_bucket && original.account_id === fields.account_id;
    if (ehParcela) {
      // parcela: a fatura acompanha só a mudança de mês da data
      const [oy, om] = original.date.split("-").map(Number);
      const [ny, nm] = fields.date.split("-").map(Number);
      patch.invoice_bucket = addMonthsToBucket(original.invoice_bucket, ny * 12 + nm - (oy * 12 + om));
    } else {
      patch.invoice_bucket = invoiceBucketFromDate(fields.date, diaFechamento);
    }
  } else if (original.invoice_bucket != null) {
    patch.invoice_bucket = null; // saiu do cartão: não pode ficar com fatura
  }
  return patch;
}

/* ------------------------------------------------------------------ */
/* RESUMO DO PAINEL                                                   */
/* ------------------------------------------------------------------ */
// Os números do topo do painel, calculados num único lugar (a tela só exibe) para poderem ser
// testados com um mês completo.
export function computeOverview({ accounts, transactions, debts, todayISO }) {
  const cards = accounts.filter((a) => a.type === "cartao");
  const usoCartoes = cards.map((card) => ({ card, uso: computeCardLimitUsage(card, transactions, todayISO) }));
  const saldoTotalContas = round2(
    accounts.filter((a) => a.type === "conta").reduce((sum, a) => sum + computeAccountBalance(a, transactions, todayISO), 0)
  );
  // fatura que já fechou e ainda não venceu + fatura aberta; parcelas de meses futuros só consomem limite
  const faturaTotalAberta = round2(usoCartoes.reduce((sum, { uso }) => sum + uso.faturaFechada + uso.faturaAtual, 0));
  const agregadoDividas = computeDebtsAggregate(debts, todayISO);
  const parcelasDividaAteFimDoMes = computeDebtsCommittedRestOfMonth(debts, todayISO);
  const comprometidoMes = round2(faturaTotalAberta + parcelasDividaAteFimDoMes);
  return {
    usoCartoes, saldoTotalContas, faturaTotalAberta, parcelasDividaAteFimDoMes, comprometidoMes,
    podeGastar: round2(saldoTotalContas - comprometidoMes),
    dividaTotalRestante: agregadoDividas.totalRestante,
    patrimonioLiquido: round2(saldoTotalContas - agregadoDividas.totalRestante - faturaTotalAberta),
    agregadoDividas,
  };
}
