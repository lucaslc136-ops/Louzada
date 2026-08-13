import { addMonthsISO, addDaysISO, addYearsISO, round2 } from "@/lib/finance/core";

export async function listTransactionsForMonth(supabase, householdId, monthCursor) {
  const start = `${monthCursor}-01`;
  const [y, m] = monthCursor.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthCursor}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("household_id", householdId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
}

// Gera as ocorrências de um lançamento (parcelas ou recorrência) já no formato de linhas do banco.
// "account" é opcional — quando é um cartão, a 1ª parcela cai na fatura certa (considerando o fechamento).
function buildOccurrences(base, account) {
  const rows = [];
  const groupId = crypto.randomUUID();

  if (base.installment && base.installment_total > 1) {
    const n = base.installment_total;
    const per = round2(base.value / n);
    const remainder = round2(base.value - per * n);

    let startDate = base.date;
    if (account && account.type === "cartao") {
      const diaFechamento = Number(account.dia_fechamento) || 25;
      const [, , purchaseDay] = base.date.split("-").map(Number);
      const offset = purchaseDay <= diaFechamento ? 0 : 1;
      startDate = addMonthsISO(base.date, offset);
    }

    for (let i = 0; i < n; i++) {
      rows.push({
        ...base,
        date: addMonthsISO(startDate, i),
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
      rows.push({
        ...base,
        date: base.recurrence === "semanal" ? addDaysISO(base.date, i * 7) : stepFn(base.date, i),
        group_id: groupId,
        group_type: "recorrencia",
      });
    }
  } else {
    rows.push({ ...base });
  }
  return rows;
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
