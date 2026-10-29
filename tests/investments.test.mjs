// Testes da carteira de investimentos.
import test from "node:test";
import assert from "node:assert/strict";
import * as inv from "../lib/finance/investments.js";

const approx = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} deveria ser ${b}`);

const carteira = [
  { id: "1", name: "Tesouro Selic 2029", kind: "tesouro_selic", institution: "BTG", valor_aplicado: 1000, valor_atual: 1100, reserva: true },
  { id: "2", name: "CDB Banco X", kind: "cdb", institution: "BTG", valor_aplicado: 500, valor_atual: 520, reserva: true },
  { id: "3", name: "HGLG11", kind: "fii", institution: "BTG", valor_aplicado: 400, valor_atual: 380, reserva: false },
  { id: "4", name: "Bitcoin", kind: "cripto", institution: "Corretora Y", valor_aplicado: 100, valor_atual: 100, reserva: false },
  { id: "5", name: "Vazio", kind: "cdb", valor_aplicado: 0, valor_atual: 0 },
];

test("resumo soma, calcula resultado e distribui por tipo, grupo e instituição", () => {
  const r = inv.summarizePortfolio(carteira);
  assert.equal(r.quantidade, 4); // a linha zerada não entra
  assert.equal(r.totalAtual, 2100);
  assert.equal(r.totalAplicado, 2000);
  assert.equal(r.resultado, 100);
  assert.equal(r.resultadoPct, 5);
  assert.equal(r.valorReserva, 1620);
  assert.equal(r.maiorPosicao.nome, "Tesouro Selic 2029");
  approx(r.maiorPosicao.pct, 52.38);
  const rf = r.porGrupo.find((g) => g.key === "renda_fixa");
  assert.equal(rf.valor, 1620);
  approx(rf.pct, 77.14);
  assert.equal(r.porInstituicao[0].label, "BTG");
  assert.equal(r.porInstituicao[0].valor, 2000);
  approx(r.porTipo.reduce((s, x) => s + x.pct, 0), 100, 0.05);
});

test("resumo de carteira vazia não quebra", () => {
  const r = inv.summarizePortfolio([]);
  assert.equal(r.totalAtual, 0);
  assert.equal(r.resultadoPct, null);
  assert.equal(r.maiorPosicao, null);
});

test("reserva de emergência mede meses cobertos e quanto falta", () => {
  const r = inv.emergencyReserveStatus({ valorReserva: 6000, despesaMediaMensal: 3000, metaMeses: 6 });
  assert.equal(r.mesesCobertos, 2);
  assert.equal(r.valorMeta, 18000);
  assert.equal(r.falta, 12000);
  assert.equal(r.atingida, false);
  assert.equal(inv.emergencyReserveStatus({ valorReserva: 20000, despesaMediaMensal: 3000 }).atingida, true);
  assert.equal(inv.emergencyReserveStatus({ valorReserva: 100, despesaMediaMensal: 0 }).mesesCobertos, null);
});

test("projeção bate com a fórmula de juros compostos com aporte no fim do mês", () => {
  const taxa = 12; // % ao ano
  const i = Math.pow(1.12, 1 / 12) - 1;
  const n = 60, pv = 1000, pmt = 100;
  const esperado = pv * Math.pow(1 + i, n) + pmt * ((Math.pow(1 + i, n) - 1) / i);
  const r = inv.projectPortfolio({ atual: pv, aporteMensal: pmt, taxaAnualPct: taxa, meses: n });
  approx(r.valorFinal, esperado, 0.05);
  assert.equal(r.totalAportado, 6000);
  approx(r.rendimento, r.valorFinal - 1000 - 6000, 0.01);
  assert.equal(r.serie.length, 61);
});

test("taxa zero só soma os aportes", () => {
  const r = inv.projectPortfolio({ atual: 500, aporteMensal: 100, taxaAnualPct: 0, meses: 12 });
  assert.equal(r.valorFinal, 1700);
  assert.equal(r.rendimento, 0);
});

test("cenários ficam em ordem e o conservador nunca usa taxa negativa", () => {
  const [c, b, o] = inv.projectScenarios({ atual: 0, aporteMensal: 100, taxaAnualPct: 2, meses: 60 });
  assert.equal(c.taxaAnualPct, 0);
  assert.ok(c.valorFinal < b.valorFinal && b.valorFinal < o.valorFinal);
});

test("meses até a meta", () => {
  assert.equal(inv.monthsToReach({ atual: 1000, aporteMensal: 0, taxaAnualPct: 0, meta: 500 }), 0);
  assert.equal(inv.monthsToReach({ atual: 0, aporteMensal: 100, taxaAnualPct: 0, meta: 1000 }), 10);
  assert.equal(inv.monthsToReach({ atual: 0, aporteMensal: 0, taxaAnualPct: 0, meta: 1000 }), null);
  const m = inv.monthsToReach({ atual: 0, aporteMensal: 100, taxaAnualPct: 12, meta: 1000 });
  assert.equal(m, 10); // com juros ainda leva 10 meses: 9 aportes rendem R$ 937, 10 rendem R$ 1.050
});

test("aporte aumenta custo e valor, e registra o movimento", () => {
  const r = inv.applyContribution({ valor_aplicado: 1000, valor_atual: 1100 }, 250);
  assert.deepEqual(r.patch, { valor_aplicado: 1250, valor_atual: 1350 });
  assert.deepEqual(r.entry, { kind: "aporte", amount: 250, valor_apos: 1350 });
  assert.throws(() => inv.applyContribution({ valor_aplicado: 0, valor_atual: 0 }, 0), /valor_invalido/);
});

test("resgate reduz o custo na mesma proporção e não deixa resgatar mais que o saldo", () => {
  const r = inv.applyRedemption({ valor_aplicado: 1000, valor_atual: 1200 }, 600);
  assert.equal(r.patch.valor_atual, 600);
  assert.equal(r.patch.valor_aplicado, 500); // o lucro proporcional segue igual (20%)
  assert.equal(r.entry.valor_apos, 600);
  assert.throws(() => inv.applyRedemption({ valor_aplicado: 100, valor_atual: 100 }, 150), /resgate_maior_que_saldo/);
  const tudo = inv.applyRedemption({ valor_aplicado: 100, valor_atual: 120 }, 120);
  assert.deepEqual(tudo.patch, { valor_aplicado: 0, valor_atual: 0 });
});

test("atualizar valor não mexe no custo", () => {
  const r = inv.applyValueUpdate({ valor_aplicado: 1000, valor_atual: 1100 }, "1.234,56".replace(".", "").replace(",", "."));
  assert.deepEqual(r.patch, { valor_atual: 1234.56 });
  assert.throws(() => inv.applyValueUpdate({}, -1), /valor_invalido/);
  assert.throws(() => inv.applyValueUpdate({}, "abc"), /valor_invalido/);
});

test("histórico leva o último valor de cada aplicação adiante", () => {
  const entries = [
    { investment_id: "a", date: "2026-08-01", kind: "saldo_inicial", valor_apos: 1000, created_at: "1" },
    { investment_id: "b", date: "2026-09-01", kind: "saldo_inicial", valor_apos: 500, created_at: "2" },
    { investment_id: "a", date: "2026-10-01", kind: "valor", valor_apos: 1100, created_at: "3" },
  ];
  assert.deepEqual(inv.buildPortfolioHistory(entries), [
    { data: "2026-08-01", valor: 1000 },
    { data: "2026-09-01", valor: 1500 },
    { data: "2026-10-01", valor: 1600 },
  ]);
});

test("média de aportes considera só os últimos meses", () => {
  const entries = [
    { kind: "aporte", date: "2026-10-05", amount: 100 },
    { kind: "aporte", date: "2026-09-05", amount: 100 },
    { kind: "aporte", date: "2026-08-05", amount: 100 },
    { kind: "aporte", date: "2026-03-05", amount: 999 }, // antigo, fora da janela
    { kind: "resgate", date: "2026-10-06", amount: 50 },
  ];
  assert.equal(inv.averageMonthlyContribution(entries, "2026-10-28", 3), 100);
});

test("avisos de concentração e cripto, sem recomendar nada", () => {
  const r = inv.summarizePortfolio(carteira);
  const a = inv.portfolioNotices(r);
  assert.equal(a.length, 1);
  assert.match(a[0], /Tesouro Selic 2029/);
  assert.equal(inv.portfolioNotices(inv.summarizePortfolio([carteira[0]])).length, 0); // uma só aplicação não gera aviso
});
