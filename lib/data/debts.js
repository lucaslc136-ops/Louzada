import { buildDebtTransactionRows } from "../finance/core.js";

// Cada passo abaixo grava num pedido separado ao Supabase (não existe transação no navegador).
// Por isso, se um passo falha no meio, os anteriores são desfeitos, para nunca sobrar uma dívida
// sem parcelas, parcelas duplicadas ou parcelas de uma dívida que não existe mais.

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
    if (txError) {
      await supabase.from("debts").delete().eq("id", debt.id); // desfaz: não deixa dívida sem parcelas
      throw txError;
    }
  }
  return debt;
}

// Editar uma dívida regenera as parcelas: grava as novas primeiro, só então apaga as antigas.
// Se qualquer passo falhar, volta ao estado anterior.
export async function updateDebt(supabase, id, patch) {
  const { data: existing, error: fetchError } = await supabase.from("debts").select("*").eq("id", id).single();
  if (fetchError) throw fetchError;

  const newGroupId = crypto.randomUUID();
  const { data: debt, error } = await supabase
    .from("debts").update({ ...patch, group_id: newGroupId }).eq("id", id).select().single();
  if (error) throw error;

  async function rollback() {
    await supabase.from("transactions").delete().eq("group_id", newGroupId);
    const { id: _id, household_id: _household, created_at: _created, ...previous } = existing;
    await supabase.from("debts").update(previous).eq("id", id);
  }

  const rows = buildDebtTransactionRows(debt, existing.household_id, newGroupId);
  if (rows.length) {
    const { error: txError } = await supabase.from("transactions").insert(rows);
    if (txError) {
      await rollback();
      throw txError;
    }
  }

  if (existing.group_id) {
    const { error: delError } = await supabase.from("transactions").delete().eq("group_id", existing.group_id);
    if (delError) {
      await rollback();
      throw delError;
    }
  }
  return debt;
}

// Excluir a dívida remove também as parcelas lançadas por ela. Se não conseguir apagar as parcelas,
// não apaga a dívida (senão sobrariam despesas soltas, sem dono).
export async function deleteDebt(supabase, id) {
  const { data: existing, error: fetchError } = await supabase.from("debts").select("group_id").eq("id", id).maybeSingle();
  if (fetchError) throw fetchError;
  if (existing?.group_id) {
    const { error: txError } = await supabase.from("transactions").delete().eq("group_id", existing.group_id);
    if (txError) throw txError;
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
    if (txError) {
      await supabase.from("debts").update({ group_id: null }).eq("id", debt.id);
      throw txError;
    }
  }
  return updated;
}
