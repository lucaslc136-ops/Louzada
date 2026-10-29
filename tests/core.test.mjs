// Testes dos cálculos do site. Rodar com `node --test tests/*.test.mjs` (não precisa instalar nada).
import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../lib/finance/core.js";

const {
  parseBRNumber, parseNaturalLanguage, computeAccountBalance, computeGoalMetrics,
  computeCardInvoices, invoiceBucketFromDate, addMonthsISO, monthsElapsedInclusive,
  computeDebtStatus, computeBudgetGroups, computeCategoryBreakdown, computeMonthlySeries,
  accountsToMap, transactionsToCSV, mergeCategories, round2,
} = core;

const approx = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) <= eps, `${a} deveria ser ${b}`);

/* ---------------- parseBRNumber ---------------- */
test("parseBRNumber entende formatos brasileiros", () => {
  assert.equal(parseBRNumber("1.500,00"), 1500);
  assert.equal(parseBRNumber("1500,5"), 1500.5);
  assert.equal(parseBRNumber("400.000"), 400000);
  assert.equal(parseBRNumber("42,90"), 42.9);
  assert.equal(parseBRNumber("-42,90"), -42.9);
  assert.ok(Number.isNaN(parseBRNumber("")));
  assert.ok(Number.isNaN(parseBRNumber(null)));
});

test("parseBRNumber nunca reinterpreta um número que já é número", () => {
  assert.equal(parseBRNumber(0.123), 0.123);
  assert.equal(parseBRNumber(2.125), 2.125);
  assert.equal(parseBRNumber(400000), 400000);
  assert.equal(parseBRNumber(1500.5), 1500.5);
});

/* ---------------- texto livre ---------------- */
const NOW = new Date(2026, 3, 15); // 15/04/2026 (abril tem 30 dias)
const ACCS = [{ id: "a1", name: "Nubank" }];

test("texto livre lê valores com milhar", () => {
  const casos = [
    ["gastei R$ 1.500,00 no mercado", 1500],
    ["gastei R$ 1.500 no mercado", 1500],
    ["gastei R$ 42,90 na padaria", 42.9],
    ["gastei R$ 42.90 na padaria", 42.9],
    ["gastei R$ 500 no mercado", 500],
    ["paguei 35 reais de uber", 35],
    ["recebi R$ 4.200,50 de salario", 4200.5],
  ];
  for (const [texto, esperado] of casos) {
    assert.equal(parseNaturalLanguage(texto, ACCS, NOW).value, esperado, texto);
  }
});

test("texto livre não gera data inválida", () => {
  assert.equal(parseNaturalLanguage("gastei R$ 10 dia 31", ACCS, NOW).date, "2026-04-30");
  assert.equal(parseNaturalLanguage("gastei R$ 10 em 31/02/2026", ACCS, NOW).date, "2026-02-28");
  assert.equal(parseNaturalLanguage("gastei R$ 10 em 29/02/2028", ACCS, NOW).date, "2028-02-29");
  assert.equal(parseNaturalLanguage("gastei R$ 10 em 05/03", ACCS, NOW).date, "2026-03-05");
  assert.equal(parseNaturalLanguage("gastei R$ 10 ontem", ACCS, NOW).date, "2026-04-14");
  assert.equal(parseNaturalLanguage("gastei R$ 10 anteontem", ACCS, NOW).date, "2026-04-13");
});

/* ---------------- saldo de conta ---------------- */
test("saldo de conta aceita saldo inicial digitado com vírgula", () => {
  const acc = { id: "c1", saldo_inicial: "1500,50" };
  assert.equal(computeAccountBalance(acc, [], "2026-10-28"), 1500.5);
  assert.equal(computeAccountBalance({ id: "c1", saldo_inicial: 1500.5 }, [], "2026-10-28"), 1500.5);
  assert.equal(computeAccountBalance({ id: "c1", saldo_inicial: "1.500,50" }, [], "2026-10-28"), 1500.5);
});

test("saldo de conta soma só o que já aconteceu", () => {
  const acc = { id: "c1", saldo_inicial: 1000 };
  const txs = [
    { account_id: "c1", type: "receita", value: 500, date: "2026-10-01" },
    { account_id: "c1", type: "despesa", value: 200.1, date: "2026-10-28" },
    { account_id: "c1", type: "despesa", value: 999, date: "2026-10-29" }, // amanhã, não entra
    { account_id: "outra", type: "despesa", value: 50, date: "2026-10-01" },
  ];
  assert.equal(computeAccountBalance(acc, txs, "2026-10-28"), 1299.9);
});

/* ---------------- datas ---------------- */
test("soma de meses não transborda nem acumula erro", () => {
  assert.equal(addMonthsISO("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsISO("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsISO("2026-01-31", 2), "2026-03-31");
  assert.equal(addMonthsISO("2026-11-30", 3), "2027-02-28");
  assert.equal(addMonthsISO("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonthsISO("2026-03-15", -3), "2025-12-15");
});

test("fatura do cartão cai no mês certo", () => {
  assert.equal(invoiceBucketFromDate("2026-10-25", 25), "2026-10");
  assert.equal(invoiceBucketFromDate("2026-10-26", 25), "2026-11");
  assert.equal(invoiceBucketFromDate("2026-12-26", 25), "2027-01");
  assert.equal(invoiceBucketFromDate("2026-01-01", 25), "2026-01");
});

test("parcelas de dívida seguem o calendário", () => {
  assert.equal(monthsElapsedInclusive("2026-10-05", "2026-10-04"), 0);
  assert.equal(monthsElapsedInclusive("2026-10-05", "2026-10-05"), 1);
  assert.equal(monthsElapsedInclusive("2026-10-05", "2026-11-04"), 1);
  assert.equal(monthsElapsedInclusive("2026-10-05", "2026-11-05"), 2);
  const d = { total_parcelas: 12, parcela: 800, data_primeira_parcela: "2026-01-31" };
  const st = computeDebtStatus(d, "2026-03-01");
  assert.equal(st.pagas, 2);
  assert.equal(st.valorPago, 1600);
  assert.equal(st.valorRestante, 8000);
  assert.equal(st.proximoVencimento, "2026-03-31");
  const quitada = computeDebtStatus(d, "2028-01-01");
  assert.equal(quitada.quitada, true);
  assert.equal(quitada.valorRestante, 0);
  assert.equal(quitada.proximoVencimento, null);
});

/* ---------------- parcelamento e recorrência ---------------- */
test("parcelas somam exatamente o valor da compra", () => {
  const rows = core.buildOccurrences({ type: "despesa", value: 100, date: "2026-10-10", installment: true, installment_total: 3, note: "Tv" }, null);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.value), [33.33, 33.33, 33.34]);
  assert.equal(round2(rows.reduce((s, r) => s + r.value, 0)), 100);
  assert.deepEqual(rows.map((r) => r.date), ["2026-10-10", "2026-11-10", "2026-12-10"]);
  assert.equal(new Set(rows.map((r) => r.group_id)).size, 1);
});

test("parcelas no cartão ganham a fatura certa (compra depois do fechamento)", () => {
  const card = { id: "k", type: "cartao", dia_fechamento: 25 };
  const rows = core.buildOccurrences({ type: "despesa", value: 300, date: "2026-10-28", installment: true, installment_total: 3 }, card);
  assert.deepEqual(rows.map((r) => r.invoice_bucket), ["2026-11", "2026-12", "2027-01"]);
  assert.deepEqual(rows.map((r) => r.date), ["2026-11-28", "2026-12-28", "2027-01-28"]);
});

test("recorrência mensal no dia 31 não acumula deslocamento", () => {
  const rows = core.buildOccurrences({ type: "despesa", value: 10, date: "2026-01-31", installment: false, recurrence: "mensal" }, null);
  assert.equal(rows.length, 12);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.date), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
});

test("dívida gera uma parcela por mês, no fim do mês quando preciso", () => {
  const rows = core.buildDebtTransactionRows(
    { nome: "Carro", total_parcelas: 4, parcela: 800.005, data_primeira_parcela: "2026-01-31", conta_id: "c1" }, "h1", "g1");
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.date), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.ok(rows.every((r) => r.value === 800.01 && r.group_id === "g1" && r.account_id === "c1"));
});

/* ---------------- cartão: limite e faturas ---------------- */
const CARD = { id: "k", type: "cartao", limite: 5000, dia_fechamento: 25, dia_vencimento: 5 };
const cardTx = (value, bucket, date = "2026-01-01") => ({ account_id: "k", type: "despesa", value, date, invoice_bucket: bucket });

test("limite do cartão considera fatura fechada, atual e parcelas futuras", () => {
  const txs = [
    cardTx(100, "2026-09"), // fechou em 25/09, venceu 05/10, já paga
    cardTx(400, "2026-10"), // fechou em 25/10, vence 05/11, ainda em aberto
    cardTx(250, "2026-11"), // fatura aberta agora
    cardTx(300, "2026-12"), // parcela futura
    cardTx(300, "2027-01"), // parcela futura
  ];
  const u = core.computeCardLimitUsage(CARD, txs, "2026-10-28");
  assert.equal(u.faturaFechada, 400);
  assert.equal(u.faturaAtual, 250);
  assert.equal(u.futuras, 600);
  assert.equal(u.proximaFatura, 300);
  assert.equal(u.demaisFuturas, 300);
  assert.equal(u.emAberto, 1250);
  assert.equal(u.disponivel, 3750);
  assert.equal(u.usoPct, 25);
});

test("fatura paga libera o limite no dia seguinte ao vencimento", () => {
  const txs = [cardTx(400, "2026-10")];
  assert.equal(core.computeCardLimitUsage(CARD, txs, "2026-11-05").emAberto, 400); // vence hoje, ainda em aberto
  assert.equal(core.computeCardLimitUsage(CARD, txs, "2026-11-06").emAberto, 0);
});

test("cartão que vence no mesmo mês do fechamento", () => {
  const card = { id: "k", type: "cartao", limite: 1000, dia_fechamento: 5, dia_vencimento: 15 };
  const txs = [cardTx(200, "2026-10")]; // fecha 05/10, vence 15/10
  assert.equal(core.computeCardLimitUsage(card, txs, "2026-10-10").faturaFechada, 200);
  assert.equal(core.computeCardLimitUsage(card, txs, "2026-10-16").emAberto, 0);
});

test("limite aceita texto digitado com vírgula", () => {
  const card = { ...CARD, limite: "5.000,00" };
  assert.equal(core.computeCardLimitUsage(card, [cardTx(1000, "2026-11")], "2026-10-28").disponivel, 4000);
});

test("fatura do mês corrente continua igual", () => {
  const inv = computeCardInvoices(CARD, [cardTx(250, "2026-11"), cardTx(10, "2026-12")], "2026-10-28");
  assert.equal(inv.currentBucket, "2026-11");
  assert.equal(inv.currentTotal, 250);
  assert.equal(inv.nextTotal, 10);
});

/* ---------------- comprometido do mês ---------------- */
test("comprometido de dívidas conta só o que ainda não saiu da conta", () => {
  const debts = [{ nome: "Carro", total_parcelas: 12, parcela: 800, data_primeira_parcela: "2026-01-05", conta_id: "c1" }];
  assert.equal(core.computeDebtsCommittedRestOfMonth(debts, "2026-10-03"), 800); // vence dia 5, ainda vai sair
  assert.equal(core.computeDebtsCommittedRestOfMonth(debts, "2026-10-05"), 0); // hoje já conta como paga
  assert.equal(core.computeDebtsCommittedRestOfMonth(debts, "2026-10-28"), 0); // já saiu do saldo
  const quitada = [{ ...debts[0], total_parcelas: 2 }];
  assert.equal(core.computeDebtsCommittedRestOfMonth(quitada, "2026-10-03"), 0);
});

/* ---------------- meta do imóvel ---------------- */
test("meta do imóvel ignora aportes com data futura", () => {
  const settings = { goal_valor_imovel: 400000, goal_pct_entrada: 20, goal_valor_inicial: 1000, goal_prazo_meses: 24 };
  const aporte = (value, date) => ({ type: "despesa", category_id: "futuro", subcategory: "Fundo do imóvel", value, date });
  const txs = [aporte(500, "2026-09-10"), aporte(500, "2026-10-10"), aporte(500, "2026-11-10"), aporte(500, "2026-12-10")];
  const m = computeGoalMetrics(settings, txs, "2026-10-28");
  assert.equal(m.valorEntrada, 80000);
  assert.equal(m.acumulado, 2000); // 1000 inicial + 2 aportes já feitos
  assert.equal(m.mediaMensal, 500);
  assert.equal(m.faltante, 78000);
});

test("meta do imóvel entende valores digitados e gravados", () => {
  const m = computeGoalMetrics({ goal_valor_imovel: "400.000", goal_pct_entrada: "17,5", goal_valor_inicial: "0" }, [], "2026-10-28");
  assert.equal(m.valorEntrada, 70000);
  const m2 = computeGoalMetrics({ goal_valor_imovel: 400000, goal_pct_entrada: 17.5, goal_valor_inicial: 0 }, [], "2026-10-28");
  assert.equal(m2.valorEntrada, 70000);
});

/* ---------------- orçamento, categorias, séries ---------------- */
test("orçamento 50/30/20 usa o mês da fatura para despesas no cartão", () => {
  const accs = accountsToMap([{ id: "c1", type: "conta" }, { id: "k", type: "cartao", dia_fechamento: 25 }]);
  const txs = [
    { account_id: "c1", type: "despesa", value: 1000, date: "2026-10-05", category_id: "moradia" },
    { account_id: "k", type: "despesa", value: 300, date: "2026-10-28", category_id: "lazer", invoice_bucket: "2026-11" },
    { account_id: "k", type: "despesa", value: 200, date: "2026-10-10", category_id: "lazer", invoice_bucket: "2026-10" },
  ];
  const out = computeBudgetGroups(txs, accs, "2026-10", 5000, { budget_necessidades: 50, budget_desejos: 30, budget_futuro: 20 });
  const by = Object.fromEntries(out.map((g) => [g.group, g]));
  assert.equal(by.necessidades.planejado, 2500);
  assert.equal(by.necessidades.gasto, 1000);
  assert.equal(by.necessidades.usoPct, 40);
  assert.equal(by.desejos.planejado, 1500);
  assert.equal(by.desejos.gasto, 200);
  assert.equal(by.futuro.planejado, 1000);
});

test("orçamento aceita percentuais gravados como número ou texto", () => {
  const a = computeBudgetGroups([], {}, "2026-10", 1000, { budget_necessidades: "50,5", budget_desejos: 30, budget_futuro: 19.5 });
  assert.equal(a[0].planejado, 505);
  assert.equal(a[2].planejado, 195);
});

test("categorias somam 100% e série mensal bate com os lançamentos", () => {
  const accs = accountsToMap([{ id: "c1", type: "conta" }]);
  const txs = [
    { account_id: "c1", type: "despesa", value: 100, date: "2026-10-05", category_id: "moradia" },
    { account_id: "c1", type: "despesa", value: 100, date: "2026-10-06", category_id: "lazer" },
    { account_id: "c1", type: "despesa", value: 100, date: "2026-10-07", category_id: "compras" },
    { account_id: "c1", type: "receita", value: 1000, date: "2026-10-01", category_id: "renda" },
  ];
  const br = computeCategoryBreakdown(txs, accs, "2026-10", mergeCategories([]));
  assert.equal(br.sum, 300);
  approx(br.rows.reduce((s, r) => s + r.pct, 0), 100, 0.05);
  const serie = computeMonthlySeries(txs, accs, "2026-10", 3);
  assert.deepEqual(serie.map((s) => s.month), ["2026-08", "2026-09", "2026-10"]);
  assert.equal(serie[2].receitas, 1000);
  assert.equal(serie[2].despesas, 300);
  assert.equal(serie[2].saldo, 700);
});

/* ---------------- edição de lançamento ---------------- */
const FORM = {
  type: "despesa", value: 50, date: "2026-10-12", category_id: "alimentacao", subcategory: "Mercado",
  account_id: "c1", payment_method: "Pix", note: "Feira",
};

test("editar lançamento simples só muda os campos editáveis", () => {
  const original = { id: "t1", type: "despesa", value: 40, date: "2026-10-10", account_id: "c1", source: "pluggy", needs_review: true, installment_total: null };
  const patch = core.buildTransactionEditPatch(FORM, { id: "c1", type: "conta" }, original);
  assert.deepEqual(Object.keys(patch).sort(), ["account_id", "category_id", "date", "needs_review", "note", "payment_method", "subcategory", "type", "value"].sort());
  assert.equal(patch.needs_review, false);
  assert.equal(patch.value, 50);
  for (const proibido of ["installment", "installment_total", "installment_current", "recurrence", "source", "group_id", "group_type", "external_id"]) {
    assert.ok(!(proibido in patch), `não pode enviar ${proibido}`);
  }
});

test("editar compra de cartão recalcula a fatura", () => {
  const card = { id: "k", type: "cartao", dia_fechamento: 25 };
  const original = { id: "t1", account_id: "k", date: "2026-10-10", invoice_bucket: "2026-10" };
  const p1 = core.buildTransactionEditPatch({ ...FORM, account_id: "k", date: "2026-10-28" }, card, original);
  assert.equal(p1.invoice_bucket, "2026-11");
  const p2 = core.buildTransactionEditPatch({ ...FORM, account_id: "k", date: "2026-10-20" }, card, original);
  assert.equal(p2.invoice_bucket, "2026-10");
});

test("mudar de cartão para conta limpa a fatura", () => {
  const original = { id: "t1", account_id: "k", date: "2026-10-10", invoice_bucket: "2026-10" };
  const patch = core.buildTransactionEditPatch(FORM, { id: "c1", type: "conta" }, original);
  assert.equal(patch.invoice_bucket, null);
});

test("editar uma parcela mantém a fatura dela e acompanha a mudança de mês", () => {
  const card = { id: "k", type: "cartao", dia_fechamento: 25 };
  const parcela = { id: "t1", account_id: "k", date: "2026-12-28", invoice_bucket: "2026-12", group_type: "parcelamento", installment_total: 3, installment_current: 2 };
  const igual = core.buildTransactionEditPatch({ ...FORM, account_id: "k", date: "2026-12-28" }, card, parcela);
  assert.equal(igual.invoice_bucket, "2026-12");
  const mais1 = core.buildTransactionEditPatch({ ...FORM, account_id: "k", date: "2027-01-28" }, card, parcela);
  assert.equal(mais1.invoice_bucket, "2027-01");
  assert.ok(!("installment_total" in igual));
});

/* ---------------- CSV ---------------- */
test("CSV escapa ponto e vírgula, aspas e quebra de linha", () => {
  const accs = accountsToMap([{ id: "c1", name: "Nubank" }]);
  const cats = mergeCategories([]);
  const csv = transactionsToCSV([{ account_id: "c1", type: "despesa", value: 1234.5, date: "2026-10-05", category_id: "moradia", subcategory: "Aluguel", note: 'João; "casa"\nnova', payment_method: "Pix" }], accs, cats);
  const linhas = csv.split("\r\n");
  assert.equal(linhas[0], "Data;Tipo;Categoria;Subcategoria;Conta;Forma de pagamento;Observação;Valor (R$)");
  assert.ok(csv.includes('"João; ""casa""\nnova"'));
  assert.ok(csv.endsWith(";1234,50"));
  assert.ok(csv.includes("05/10/2026"));
});

/* ---------------- mês completo, números conferidos à mão ---------------- */
test("painel de 28/10/2026 com conta, cartão e dívida", () => {
  const accounts = [
    { id: "c1", type: "conta", saldo_inicial: "1.000,00" },
    { id: "k", type: "cartao", limite: 5000, dia_fechamento: 25, dia_vencimento: 5 },
  ];
  const t = (account_id, type, value, date, extra = {}) => ({ account_id, type, value, date, ...extra });
  const transactions = [
    t("c1", "receita", 5000, "2026-10-05"), // salário
    t("c1", "despesa", 1200, "2026-10-10"), // aluguel
    t("c1", "despesa", 800, "2026-10-05", { group_type: "divida" }), // parcela da dívida, já saiu
    t("c1", "despesa", 300, "2026-11-10"), // futuro, não entra no saldo de hoje
    t("k", "despesa", 400, "2026-10-20", { invoice_bucket: "2026-10" }), // fatura fechada, vence 05/11
    t("k", "despesa", 250, "2026-10-27", { invoice_bucket: "2026-11" }), // fatura aberta
    t("k", "despesa", 300, "2026-12-27", { invoice_bucket: "2026-12" }), // parcela futura
  ];
  const debts = [{ nome: "Carro", total_parcelas: 12, parcela: 800, data_primeira_parcela: "2026-01-05", conta_id: "c1" }];
  const o = core.computeOverview({ accounts, transactions, debts, todayISO: "2026-10-28" });
  assert.equal(o.saldoTotalContas, 4000); // 1000 + 5000 - 1200 - 800
  assert.equal(o.faturaTotalAberta, 650); // 400 fechada + 250 aberta
  assert.equal(o.parcelasDividaAteFimDoMes, 0); // a de outubro já saiu do saldo
  assert.equal(o.comprometidoMes, 650);
  assert.equal(o.podeGastar, 3350); // 4000 - 650
  assert.equal(o.dividaTotalRestante, 1600); // pagas 10 de 12, faltam 2 x 800
  assert.equal(o.patrimonioLiquido, 1750); // 4000 - 1600 - 650
  assert.equal(o.usoCartoes[0].uso.emAberto, 950);
  assert.equal(o.usoCartoes[0].uso.disponivel, 4050);
  // três dias antes, a parcela de 800 ainda estava por sair
  const antes = core.computeOverview({ accounts, transactions: transactions.filter((x) => x.group_type !== "divida"), debts, todayISO: "2026-10-03" });
  assert.equal(antes.parcelasDividaAteFimDoMes, 800);
  assert.equal(antes.comprometidoMes, antes.faturaTotalAberta + 800);
});

/* ---------------- pagamento de fatura não é receita nem despesa ---------------- */
test("pagamento de fatura (crédito no cartão e débito que pagou) fica fora de receitas e despesas", () => {
  const accounts = [
    { id: "itau", type: "conta", saldo_inicial: 0 },
    { id: "caixa", type: "cartao", limite: 5000, dia_fechamento: 25, dia_vencimento: 5 },
  ];
  const map = accountsToMap(accounts);
  const t = (id, account_id, type, value, date, note, extra = {}) => ({ id, account_id, type, value, date, note, category_id: type === "receita" ? "renda" : "outros", ...extra });
  const txs = [
    t("sal", "itau", "receita", 5000, "2026-10-05", "Salário"),
    t("deb", "itau", "despesa", 608.83, "2026-10-09", "Pagamento de boleto CARTOES CAIXA ELO PF"),
    t("c1", "caixa", "receita", 608.83, "2026-10-09", "PGTO.BOLETO REGISTRADO"),
    t("c2", "caixa", "receita", 608.83, "2026-10-09", "Pagamento recebido"), // o banco repete o mesmo pagamento
    t("c3", "caixa", "receita", 0.11, "2026-10-19", "AJUSTE CRED PARC S/ JUROS"),
    t("mercado", "itau", "despesa", 300, "2026-10-12", "Supermercado"),
  ];
  const ids = core.cardPaymentIds(txs, map);
  assert.deepEqual([...ids].sort(), ["c1", "c2", "c3", "deb"]);
  // meses de caixa: crédito do cartão cai no bucket da fatura; compara só outubro nas contas da conta corrente
  const serie = computeMonthlySeries(txs, map, "2026-11", 2);
  const totalReceitas = serie.reduce((s, m) => s + m.receitas, 0);
  const totalDespesas = serie.reduce((s, m) => s + m.despesas, 0);
  assert.equal(totalReceitas, 5000); // só o salário
  assert.equal(totalDespesas, 300); // só o mercado
  // categorias e orçamento também ignoram o débito do boleto
  const cat = computeCategoryBreakdown(txs, map, "2026-10");
  assert.equal(cat.sum, 300);
  // o saldo da conta corrente continua descontando o pagamento (o dinheiro saiu de verdade)
  assert.equal(computeAccountBalance(accounts[0], txs, "2026-10-28"), 5000 - 608.83 - 300);
});

test("despesa comum com o mesmo valor de um crédito de cartão não é confundida com pagamento", () => {
  const accounts = [
    { id: "itau", type: "conta", saldo_inicial: 0 },
    { id: "k", type: "cartao", limite: 1000, dia_fechamento: 25, dia_vencimento: 5 },
  ];
  const map = accountsToMap(accounts);
  const txs = [
    { id: "a", account_id: "k", type: "receita", value: 100, date: "2026-10-09", note: "Estorno loja" },
    { id: "b", account_id: "itau", type: "despesa", value: 100, date: "2026-10-09", note: "Farmácia" }, // sem palavra de pagamento
  ];
  const ids = core.cardPaymentIds(txs, map);
  assert.ok(ids.has("a"));
  assert.ok(!ids.has("b"));
});
