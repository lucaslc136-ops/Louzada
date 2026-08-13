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

