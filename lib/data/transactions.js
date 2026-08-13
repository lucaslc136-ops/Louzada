import { addMonthsISO, addDaysISO, addYearsISO, round2, invoiceBucketFromDate, addMonthsToBucket } from "@/lib/finance/core";

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

// Todas as transações da família — usado pra calcular saldo de conta e histórico de fatura,
// que precisam olhar além do mês selecionado.
export async function listAllTransactions(supabase, householdId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("household_id", householdId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

// Gera as ocorrências de um lançamento (parcelas ou recorrência) já no formato de linhas do banco.
// "account" é opcional — quando é um cartão, toda ocorrência já sai marcada com a fatura certa
// (invoice_bucket), calculada a partir da data ORIGINAL da compra — nunca de uma data já deslocada,
// pra não deslocar duas vezes.
function buildOccurrences(base, account) {
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
