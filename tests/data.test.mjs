// Testes da camada de dados: paginação (limite de 1000), dívidas sem estado pela metade, exclusões.
import test from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./fake-supabase.mjs";
import { fetchAllPages, fetchExistingExternalIds } from "../lib/data/paginate.js";
import { listAllTransactions, deleteTransactionsByIds, previewTransactionsDeletion } from "../lib/data/transactions.js";
import { createDebt, updateDebt, deleteDebt, syncDebtTransactions } from "../lib/data/debts.js";

// o erro do Supabase é um objeto simples (não um Error), então conferimos pela mensagem
const FALHA = (e) => /falha simulada/.test(e?.message);

const manyTx = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${String(i).padStart(5, "0")}`, household_id: "h1", account_id: "c1", type: "despesa",
    value: 1, date: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`, ...extra,
  }));

test("sem paginar, o Supabase corta em 1000 (o problema que o helper resolve)", async () => {
  const db = createFakeSupabase({ transactions: manyTx(2500) });
  const { data } = await db.from("transactions").select("*").eq("household_id", "h1");
  assert.equal(data.length, 1000);
});

test("listAllTransactions traz todas as linhas, sem repetir nem perder", async () => {
  const db = createFakeSupabase({ transactions: manyTx(2500) });
  const rows = await listAllTransactions(db, "h1");
  assert.equal(rows.length, 2500);
  assert.equal(new Set(rows.map((r) => r.id)).size, 2500);
});

test("exatamente 1000 linhas ainda confere a página seguinte", async () => {
  const db = createFakeSupabase({ transactions: manyTx(1000) });
  const rows = await listAllTransactions(db, "h1");
  assert.equal(rows.length, 1000);
});

test("paginação repassa o erro em vez de devolver dados pela metade", async () => {
  const db = createFakeSupabase({ transactions: manyTx(2500) });
  await assert.rejects(
    fetchAllPages(() => {
      const q = db.from("transactions").select("*").order("id");
      if (db.calls.filter((c) => c.range).length === 1) db.failNext("transactions", "select");
      return q;
    }),
    FALHA
  );
});

test("prévia de exclusão conta todas as linhas, não só 1000", async () => {
  const db = createFakeSupabase({ transactions: manyTx(1500) });
  const preview = await previewTransactionsDeletion(db, "h1", { type: "tudo" });
  assert.equal(preview.count, 1500);
  assert.equal(preview.total, 1500);
});

test("exclusão de muitos lançamentos selecionados é feita em blocos", async () => {
  const db = createFakeSupabase({ transactions: manyTx(250) });
  const ids = db.tables.transactions.map((t) => t.id);
  await deleteTransactionsByIds(db, ids);
  assert.equal(db.tables.transactions.length, 0);
  assert.equal(db.calls.filter((c) => c.op === "delete").length, 3);
});

test("ids já importados do banco são achados mesmo com centenas de ids", async () => {
  const db = createFakeSupabase({ transactions: manyTx(900).map((t, i) => ({ ...t, external_id: `ext-${i}` })) });
  const wanted = Array.from({ length: 1200 }, (_, i) => `ext-${i}`);
  const found = await fetchExistingExternalIds(db, "h1", wanted);
  assert.equal(found.length, 900);
});

/* ---------------- dívidas ---------------- */
const DEBT = { nome: "Carro", valor_total: 9600, parcela: 800, total_parcelas: 12, data_primeira_parcela: "2026-01-31", taxa_juros: 0, conta_id: "c1" };
const parcelasDe = (db, groupId) => db.tables.transactions.filter((t) => t.group_id === groupId);

test("criar dívida gera uma parcela por mês", async () => {
  const db = createFakeSupabase();
  const debt = await createDebt(db, "h1", DEBT);
  assert.equal(db.tables.debts.length, 1);
  assert.equal(parcelasDe(db, debt.group_id).length, 12);
});

test("se as parcelas falham, a dívida não fica sozinha", async () => {
  const db = createFakeSupabase();
  db.failNext("transactions", "insert");
  await assert.rejects(createDebt(db, "h1", DEBT), FALHA);
  assert.equal(db.tables.debts.length, 0);
  assert.equal(db.tables.transactions.length, 0);
});

test("editar dívida troca as parcelas antigas pelas novas", async () => {
  const db = createFakeSupabase();
  const debt = await createDebt(db, "h1", DEBT);
  const novo = await updateDebt(db, debt.id, { ...DEBT, parcela: 900, total_parcelas: 6 });
  assert.notEqual(novo.group_id, debt.group_id);
  assert.equal(parcelasDe(db, debt.group_id).length, 0);
  const novas = parcelasDe(db, novo.group_id);
  assert.equal(novas.length, 6);
  assert.ok(novas.every((t) => t.value === 900));
  assert.equal(db.tables.transactions.length, 6);
});

test("editar dívida: falha ao gravar as novas parcelas desfaz tudo", async () => {
  const db = createFakeSupabase();
  const debt = await createDebt(db, "h1", DEBT);
  db.failNext("transactions", "insert");
  await assert.rejects(updateDebt(db, debt.id, { ...DEBT, parcela: 900 }), FALHA);
  const salvo = db.tables.debts[0];
  assert.equal(salvo.parcela, 800);
  assert.equal(salvo.group_id, debt.group_id);
  assert.equal(db.tables.transactions.length, 12);
  assert.ok(db.tables.transactions.every((t) => t.value === 800));
});

test("editar dívida: falha ao apagar as parcelas antigas não duplica nada", async () => {
  const db = createFakeSupabase();
  const debt = await createDebt(db, "h1", DEBT);
  db.failNext("transactions", "delete");
  await assert.rejects(updateDebt(db, debt.id, { ...DEBT, parcela: 900 }), FALHA);
  assert.equal(db.tables.debts[0].parcela, 800);
  assert.equal(db.tables.transactions.length, 12);
  assert.ok(db.tables.transactions.every((t) => t.group_id === debt.group_id));
});

test("excluir dívida: se as parcelas não saem, a dívida fica", async () => {
  const db = createFakeSupabase();
  const debt = await createDebt(db, "h1", DEBT);
  db.failNext("transactions", "delete");
  await assert.rejects(deleteDebt(db, debt.id), FALHA);
  assert.equal(db.tables.debts.length, 1);
  assert.equal(db.tables.transactions.length, 12);
  await deleteDebt(db, debt.id);
  assert.equal(db.tables.debts.length, 0);
  assert.equal(db.tables.transactions.length, 0);
});

test("sincronizar dívida antiga gera parcelas uma única vez", async () => {
  const db = createFakeSupabase({ debts: [{ id: "d1", household_id: "h1", ...DEBT, group_id: null }] });
  const atualizada = await syncDebtTransactions(db, "h1", db.tables.debts[0]);
  assert.equal(parcelasDe(db, atualizada.group_id).length, 12);
  await syncDebtTransactions(db, "h1", atualizada);
  assert.equal(db.tables.transactions.length, 12);
});

test("sincronizar: se falhar, a dívida volta a ficar sem grupo", async () => {
  const db = createFakeSupabase({ debts: [{ id: "d1", household_id: "h1", ...DEBT, group_id: null }] });
  db.failNext("transactions", "insert");
  await assert.rejects(syncDebtTransactions(db, "h1", db.tables.debts[0]), FALHA);
  assert.equal(db.tables.debts[0].group_id, null);
});

test("applyCategoryToIds muda só categoria, subcategoria e revisão, em blocos", async () => {
  const { applyCategoryToIds } = await import("../lib/data/transactions.js");
  const rows = Array.from({ length: 250 }, (_, i) => ({ id: `t${i}`, household_id: "h", category_id: "outros", subcategory: "Diversos", needs_review: true, value: 10 + i, date: "2026-10-01" }));
  rows.push({ id: "outra", household_id: "h2", category_id: "outros", subcategory: "Diversos", needs_review: true, value: 1, date: "2026-10-01" });
  const fake = createFakeSupabase({ transactions: rows });
  await applyCategoryToIds(fake, "h", rows.slice(0, 250).map((r) => r.id), "saude", "Farmácia");
  const mudou = fake.tables.transactions.filter((r) => r.household_id === "h");
  assert.ok(mudou.every((r) => r.category_id === "saude" && r.subcategory === "Farmácia" && r.needs_review === false));
  assert.equal(mudou[5].value, 15); // valor intacto
  assert.equal(fake.tables.transactions.find((r) => r.id === "outra").category_id, "outros"); // outra família não é afetada
  assert.equal(fake.calls.filter((c) => c.op === "update").length, 3); // 250 ids em 3 blocos
});

/* ---------------- investimentos ---------------- */
test("criar aplicação grava o saldo inicial, e desfaz tudo se o histórico falhar", async () => {
  const { createInvestment } = await import("../lib/data/investments.js");
  const fake = createFakeSupabase({ investments: [], investment_entries: [] });
  const inv = await createInvestment(fake, "h", { name: "CDB X", kind: "cdb", valor_aplicado: 1000, valor_atual: 1050 }, "2026-10-28");
  assert.equal(fake.tables.investments.length, 1);
  assert.equal(fake.tables.investment_entries.length, 1);
  assert.equal(fake.tables.investment_entries[0].valor_apos, 1050);
  assert.equal(fake.tables.investment_entries[0].investment_id, inv.id);

  fake.failNext("investment_entries", "insert");
  await assert.rejects(() => createInvestment(fake, "h", { name: "Outra", valor_atual: 10 }, "2026-10-28"), FALHA);
  assert.equal(fake.tables.investments.length, 1, "a aplicação sem histórico foi desfeita");
});

test("aporte, resgate e atualização gravam o movimento e voltam atrás se o histórico falhar", async () => {
  const { createInvestment, registerMovement } = await import("../lib/data/investments.js");
  const fake = createFakeSupabase({ investments: [], investment_entries: [] });
  let inv = await createInvestment(fake, "h", { name: "Selic", kind: "tesouro_selic", valor_aplicado: 1000, valor_atual: 1100 }, "2026-10-01");
  inv = await registerMovement(fake, "h", inv, "aporte", 200, "2026-10-10");
  assert.equal(inv.valor_atual, 1300);
  assert.equal(inv.valor_aplicado, 1200);
  inv = await registerMovement(fake, "h", inv, "resgate", 650, "2026-10-12");
  assert.equal(inv.valor_atual, 650);
  assert.equal(inv.valor_aplicado, 600);
  inv = await registerMovement(fake, "h", inv, "valor", 700, "2026-10-20");
  assert.equal(inv.valor_atual, 700);
  assert.equal(inv.valor_aplicado, 600);
  assert.equal(fake.tables.investment_entries.length, 4);

  fake.failNext("investment_entries", "insert");
  await assert.rejects(() => registerMovement(fake, "h", inv, "aporte", 50, "2026-10-21"), FALHA);
  const guardada = fake.tables.investments[0];
  assert.equal(guardada.valor_atual, 700);
  assert.equal(guardada.valor_aplicado, 600);

  await assert.rejects(() => registerMovement(fake, "h", inv, "resgate", 9999, "2026-10-21"), /resgate_maior_que_saldo/);
  assert.equal(fake.tables.investment_entries.length, 4, "validação falhou antes de gravar qualquer coisa");
});

test("campos descritivos não deixam mudar valores por fora do histórico", async () => {
  const { createInvestment, updateInvestmentFields } = await import("../lib/data/investments.js");
  const fake = createFakeSupabase({ investments: [], investment_entries: [] });
  const inv = await createInvestment(fake, "h", { name: "A", valor_aplicado: 10, valor_atual: 10 }, "2026-10-01");
  await updateInvestmentFields(fake, inv.id, { name: "B", valor_atual: 99999, reserva: true });
  const g = fake.tables.investments[0];
  assert.equal(g.name, "B");
  assert.equal(g.reserva, true);
  assert.equal(g.valor_atual, 10);
});
