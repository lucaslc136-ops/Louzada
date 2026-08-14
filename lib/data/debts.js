import { addMonthsISO, round2 } from "@/lib/finance/core";

// Categoria já existente no app pra pagamento de dívida — não precisa criar categoria nova.
const DEBT_CATEGORY_ID = "futuro";
const DEBT_SUBCATEGORY = "Pagamento de dívida";

function buildDebtTransactionRows(debt, householdId, groupId) {
  const total = Number(debt.total_parcelas) || 0;
  const parcela = round2(Number(debt.parcela) || 0);
  const rows = [];
  for (let i = 0; i < total; i++) {
    rows.push({
      household_id: householdId,
      type: "despesa",
      value: parcela,
      date: addMonthsISO(debt.data_primeira_parcela, i),
      category_id: DEBT_CATEGORY_ID,
      subcategory: DEBT_SUBCATEGORY,
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

export async function listDebts(supabase, householdId) {
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Cria a dívida E já gera as parcelas como lançamentos de despesa de verdade — assim elas contam em
// Despesas do mês, Fluxo de Caixa e Orçamento 50/30/20, e aparecem na lista de Lançamentos.
export async function createDebt(supabase, householdId, fields) {
  const groupId = crypto.randomUUID();
  const { data: debt, error } = await supabase
    .from("debts")
    .insert({ household_id: householdId, ...fields, group_id: groupId })
    .select()
    .single();
  if (error) throw error;

  const rows = buildDebtTransactionRows(debt, householdId, groupId);
  if (rows.length) {
    const { error: txError } = await supabase.from("transactions").insert(rows);
    if (txError) throw txError;
  }
  return debt;
}

// Editar uma dívida regenera as parcelas do zero (apaga o grupo antigo, cria um novo) — mais simples
// e seguro do que tentar ajustar parcela a parcela.
export async function updateDebt(supabase, id, patch) {
  const { data: existing, error: fetchError } = await supabase
    .from("debts").select("group_id, household_id").eq("id", id).single();
  if (fetchError) throw fetchError;

  if (existing.group_id) {
    const { error: delError } = await supabase.from("transactions").delete().eq("group_id", existing.group_id);
    if (delError) throw delError;
  }

  const groupId = crypto.randomUUID();
  const { data: debt, error } = await supabase
    .from("debts").update({ ...patch, group_id: groupId }).eq("id", id).select().single();
  if (error) throw error;

  const rows = buildDebtTransactionRows(debt, existing.household_id, groupId);
  if (rows.length) {
    const { error: txError } = await supabase.from("transactions").insert(rows);
    if (txError) throw txError;
  }
  return debt;
}

// Excluir a dívida remove também as parcelas lançadas por ela.
export async function deleteDebt(supabase, id) {
  const { data: existing } = await supabase.from("debts").select("group_id").eq("id", id).maybeSingle();
  if (existing?.group_id) {
    await supabase.from("transactions").delete().eq("group_id", existing.group_id);
  }
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) throw error;
}

// Pra dívidas cadastradas ANTES dessa correção (sem group_id) — gera as parcelas que faltam,
// sem duplicar nada em dívidas que já foram sincronizadas.
export async function syncDebtTransactions(supabase, householdId, debt) {
  if (debt.group_id) return debt;
  const groupId = crypto.randomUUID();
  const { data: updated, error } = await supabase
    .from("debts").update({ group_id: groupId }).eq("id", debt.id).select().single();
  if (error) throw error;

  const rows = buildDebtTransactionRows(updated, householdId, groupId);
  if (rows.length) {
    const { error: txError } = await supabase.from("transactions").insert(rows);
    if (txError) throw txError;
  }
  return updated;
}
