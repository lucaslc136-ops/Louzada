import { buildOccurrences } from "../finance/core.js";
import { fetchAllPages } from "./paginate.js";

export async function listTransactionsForMonth(supabase, householdId, monthCursor) {
  const start = `${monthCursor}-01`;
  const [y, m] = monthCursor.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthCursor}-${String(lastDay).padStart(2, "0")}`;
  return listTransactionsForRange(supabase, householdId, start, end);
}

// Lançamentos do mês atual + do mês anterior — necessário pra calcular corretamente o "mês de
// impacto no fluxo de caixa" de compras no cartão, que às vezes vêm do mês anterior.
export async function listTransactionsForMonthWindow(supabase, householdId, monthCursor) {
  const [y, m] = monthCursor.split("-").map(Number);
  const prevTotal = y * 12 + (m - 1) - 1;
  const prevY = Math.floor(prevTotal / 12);
  const prevM = (prevTotal % 12) + 1;
  const start = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthCursor}-${String(lastDay).padStart(2, "0")}`;
  return listTransactionsForRange(supabase, householdId, start, end);
}

// Lançamentos dentro de um intervalo de datas específico — usado pelo filtro de período
// personalizado (fora do navegador de mês). Busca em páginas: o Supabase corta em 1000 linhas.
export async function listTransactionsForRange(supabase, householdId, startDate, endDate) {
  return fetchAllPages(() =>
    supabase
      .from("transactions")
      .select("*")
      .eq("household_id", householdId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("id", { ascending: true })
  );
}

// Todas as transações da família — usado pra calcular saldo de conta e histórico de fatura,
// que precisam olhar além do mês selecionado. Busca em páginas: o Supabase corta em 1000 linhas.
export async function listAllTransactions(supabase, householdId) {
  return fetchAllPages(() =>
    supabase
      .from("transactions")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: false })
      .order("id", { ascending: true })
  );
}

export async function createTransaction(supabase, householdId, base, account) {
  const rows = buildOccurrences({ ...base, household_id: householdId }, account).map((r) => {
    // remove campos auxiliares que não são colunas da tabela
    const { installment, ...rest } = r;
    return { ...rest, installment: !!installment };
  });
  const { data, error } = await supabase.from("transactions").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updateTransaction(supabase, id, patch) {
  const { data, error } = await supabase.from("transactions").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(supabase, id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTransactionGroup(supabase, groupId) {
  const { error } = await supabase.from("transactions").delete().eq("group_id", groupId);
  if (error) throw error;
}

// Apaga uma lista específica de lançamentos, marcados um a um pelo usuário (checkbox na lista).
export async function deleteTransactionsByIds(supabase, ids) {
  // em blocos: uma lista muito longa de ids estoura o tamanho máximo do endereço da requisição
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase.from("transactions").delete().in("id", ids.slice(i, i + 100));
    if (error) throw error;
  }
}

// Aplica a mesma categoria a vários lançamentos (revisão em lote). Só mexe em categoria,
// subcategoria e no aviso de revisão; valores, datas e contas ficam intactos.
export async function applyCategoryToIds(supabase, householdId, ids, categoryId, subcategory) {
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase
      .from("transactions")
      .update({ category_id: categoryId, subcategory: subcategory || null, needs_review: false })
      .eq("household_id", householdId)
      .in("id", ids.slice(i, i + 100));
    if (error) throw error;
  }
}

/* ------------------------------------------------------------------ */
/* EXCLUSÃO EM LOTE — usado na "zona de risco" de Configurações       */
/* ------------------------------------------------------------------ */
// scope: { type: "hoje" } | { type: "conta", accountId } | { type: "tudo" }
// Sempre conta/soma ANTES de apagar, pra mostrar exatamente o que vai ser afetado na confirmação.

function applyDeletionScope(query, householdId, scope) {
  query = query.eq("household_id", householdId);
  if (scope.type === "hoje") {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    query = query.gte("created_at", inicioHoje.toISOString());
  } else if (scope.type === "conta") {
    query = query.eq("account_id", scope.accountId);
  }
  return query;
}

export async function previewTransactionsDeletion(supabase, householdId, scope) {
  const data = await fetchAllPages(() =>
    applyDeletionScope(supabase.from("transactions").select("value"), householdId, scope).order("id", { ascending: true })
  );
  return { count: data.length, total: data.reduce((s, t) => s + Number(t.value), 0) };
}

export async function deleteTransactionsByScope(supabase, householdId, scope) {
  const query = applyDeletionScope(supabase.from("transactions").delete(), householdId, scope);
  const { error } = await query;
  if (error) throw error;
}

// Busca lançamentos específicos pelo ID, de qualquer mês — usado quando o sino de alertas
// aponta pra transações exatas que precisam de revisão, não um período/mês genérico.
export async function listTransactionsByIds(supabase, householdId, ids) {
  const { data, error } = await supabase
    .from("transactions").select("*")
    .eq("household_id", householdId).in("id", ids);
  if (error) throw error;
  return data;
}
