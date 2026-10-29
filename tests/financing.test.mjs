// Testes do motor de financiamento (SAC e Price) e das simulações do MCMV.
import test from "node:test";
import assert from "node:assert/strict";
import { calcularSAC, calcularPrice, calcularFinanciamento, taxaAnualParaMensal, agruparPorAno } from "../lib/mcmv/financing.js";
import { simularFinanciamento, simularQuantoPossoComprar, simularPorParcelaMaxima, comprometimentoRenda, avaliarElegibilidade } from "../lib/mcmv/simulation.js";
import { classificarFaixa } from "../lib/mcmv/config.js";

const approx = (a, b, eps = 0.02) => assert.ok(Math.abs(a - b) <= eps, `${a} deveria ser ${b}`);

test("taxa anual vira mensal por juros compostos", () => {
  approx(taxaAnualParaMensal(0.12), 0.0094888, 1e-6);
  assert.equal(taxaAnualParaMensal(0), 0);
});

test("SAC amortiza exatamente o valor financiado", () => {
  const r = calcularSAC(200000, 0.0825, 360);
  assert.equal(r.tabela.length, 360);
  approx(r.tabela.reduce((s, l) => s + l.amortizacao, 0), 200000, 0.01);
  assert.equal(r.tabela[359].saldoDevedor, 0);
  assert.ok(r.parcelaInicial > r.parcelaFinal);
  approx(r.totalPago - r.totalJuros, 200000, 0.05);
  for (let i = 1; i < r.tabela.length; i++) assert.ok(r.tabela[i].parcela <= r.tabela[i - 1].parcela + 0.01);
});

test("Price tem parcela fixa igual à fórmula PMT e fecha o saldo em zero", () => {
  const pv = 200000, i = taxaAnualParaMensal(0.0825), n = 360;
  const pmt = (pv * i) / (1 - Math.pow(1 + i, -n));
  const r = calcularPrice(pv, 0.0825, n);
  approx(r.parcelaInicial, pmt, 0.01);
  assert.equal(r.tabela[n - 1].saldoDevedor, 0);
  approx(r.totalPago - r.totalJuros, pv, 0.05);
  approx(r.tabela[n - 2].parcela, r.parcelaInicial, 0.01);
});

test("taxa zero divide o valor em parcelas iguais", () => {
  const p = calcularPrice(120000, 0, 120);
  assert.equal(p.parcelaInicial, 1000);
  assert.equal(p.totalJuros, 0);
  const s = calcularSAC(120000, 0, 120);
  assert.equal(s.parcelaInicial, 1000);
  assert.equal(s.totalJuros, 0);
});

test("valores inválidos não geram tabela", () => {
  assert.equal(calcularFinanciamento("SAC", 0, 0.08, 360), null);
  assert.equal(calcularFinanciamento("Price", 100000, 0.08, 0), null);
  assert.equal(calcularFinanciamento("SAC", -5, 0.08, 360), null);
});

test("agrupamento por ano soma juros e amortização", () => {
  const r = calcularSAC(120000, 0.08, 30);
  const anos = agruparPorAno(r.tabela);
  assert.equal(anos.length, 3);
  approx(anos.reduce((s, a) => s + a.jurosTotal, 0), r.totalJuros, 0.05);
  approx(anos.reduce((s, a) => s + a.amortizacaoTotal, 0), 120000, 0.05);
  assert.equal(anos[2].saldoFinal, 0);
});

test("faixas do MCMV sem buraco entre elas", () => {
  assert.equal(classificarFaixa(3200).id, 1);
  assert.equal(classificarFaixa(3200.01).id, 2);
  assert.equal(classificarFaixa(3200.005).id, 2);
  assert.equal(classificarFaixa(5000.004).id, 3);
  assert.equal(classificarFaixa(9600.5).id, 4);
  assert.equal(classificarFaixa(13000).id, 4);
  assert.equal(classificarFaixa(13000.01), null);
  assert.equal(classificarFaixa(0).id, 1);
});

test("comprometimento de renda classifica pelos limites", () => {
  assert.equal(comprometimentoRenda(1000, 4000).nivel, "confortavel"); // 25%
  assert.equal(comprometimentoRenda(1100, 4000).nivel, "limite"); // 27,5%
  assert.equal(comprometimentoRenda(1300, 4000).nivel, "incompativel"); // 32,5%
  assert.equal(comprometimentoRenda(1000, 0).nivel, "indefinido");
});

test("simulação direta: financiado = imóvel - entrada - FGTS - subsídio", () => {
  const r = simularFinanciamento({ renda: 4200, valorImovel: 259000, entrada: 20000, fgts: 8000, prazoMeses: 420, sistema: "SAC", estado: "SP" });
  const sub = r.elegibilidade.subsidioEstimado;
  approx(r.entradaTotal, 28000 + sub, 0.01);
  approx(r.valorFinanciado, 259000 - 28000 - sub, 0.01);
  approx(r.financiamento.totalPago - r.financiamento.totalJuros, r.valorFinanciado, 0.1);
});

test("simulação nunca devolve financiado negativo", () => {
  const r = simularFinanciamento({ renda: 4200, valorImovel: 100000, entrada: 150000, fgts: 0, prazoMeses: 360, sistema: "Price", estado: "SP" });
  assert.equal(r.valorFinanciado, 0);
  assert.equal(r.financiamento, null);
});

test("quanto posso comprar respeita o teto e a parcela máxima", () => {
  const r = simularQuantoPossoComprar({ renda: 4200, entrada: 20000, fgts: 8000, prazoMeses: 420, sistema: "SAC", estado: "SP" });
  assert.ok(r.valorMaximoImovel <= r.elegibilidade.tetoImovel);
  assert.ok(r.financiamento.parcelaInicial <= r.parcelaMaxima + 0.01);
  approx(r.valorFinanciado + r.entradaDisponivel, r.valorMaximoImovel, 0.02);
});

test("quanto posso pagar por mês respeita a parcela escolhida", () => {
  const r = simularPorParcelaMaxima({ renda: 4200, parcelaMaxima: 1200, entrada: 20000, fgts: 0, prazoMeses: 420, sistema: "Price", estado: "SP" });
  assert.ok(r.financiamento.parcelaInicial <= 1200.01);
  approx(r.valorImovelEstimado, r.valorFinanciadoMax + r.entradaTotal, 0.02);
});

test("região Norte/Nordeste reduz a taxa e imóvel usado reduz a cota", () => {
  const sp = avaliarElegibilidade({ renda: 4200, estado: "SP" });
  const ce = avaliarElegibilidade({ renda: 4200, estado: "CE" });
  approx(sp.taxaAnualEstimada - ce.taxaAnualEstimada, 0.005, 1e-9);
  const usado = avaliarElegibilidade({ renda: 4200, estado: "SP", imovelUsado: true });
  approx(sp.pctMaxFinanciamento - usado.pctMaxFinanciamento, 0.05, 1e-9);
});
