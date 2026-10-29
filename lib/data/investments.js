// Camada de dados da carteira de investimentos. Sem transação no banco, então cada operação que
// mexe em duas tabelas desfaz a primeira se a segunda falhar (mesmo padrão de lib/data/debts.js).
import { fetchAllPages } from "./paginate.js";
import { applyContribution, applyRedemption, applyValueUpdate } from "../finance/investments.js";

export async function listInvestments(supabase, householdId) {
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listInvestmentEntries(supabase, householdId) {
  return fetchAllPages(() =>
    supabase
      .from("investment_entries")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: true })
      .order("id", { ascending: true })
  );
}

export async function createInvestment(supabase, householdId, fields, todayISO) {
  const row = {
    household_id: householdId,
    name: fields.name,
    kind: fields.kind || "outro",
    institution: fields.institution || null,
    valor_aplicado: fields.valor_aplicado ?? 0,
    valor_atual: fields.valor_atual ?? 0,
    taxa_anual: fields.taxa_anual ?? null,
    vencimento: fields.vencimento || null,
    reserva: !!fields.reserva,
    notes: fields.notes || null,
  };
  const { data: inv, error } = await supabase.from("investments").insert(row).select().single();
  if (error) throw error;
  const { error: entryError } = await supabase.from("investment_entries").insert({
    household_id: householdId, investment_id: inv.id, date: todayISO,
    kind: "saldo_inicial", amount: 0, valor_apos: row.valor_atual,
  });
  if (entryError) {
    await supabase.from("investments").delete().eq("id", inv.id); // desfaz: não deixa aplicação sem histórico
    throw entryError;
  }
  return inv;
}

// Campos descritivos. Valores (aplicado e atual) só mudam por registerMovement, que deixa histórico.
export async function updateInvestmentFields(supabase, id, patch) {
  const permitidos = ["name", "kind", "institution", "taxa_anual", "vencimento", "reserva", "notes"];
  const limpo = Object.fromEntries(Object.entries(patch).filter(([k]) => permitidos.includes(k)));
  const { data, error } = await supabase
    .from("investments").update({ ...limpo, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// kind: "aporte" | "resgate" | "valor"
export async function registerMovement(supabase, householdId, inv, kind, value, dateISO) {
  const aplicar = { aporte: applyContribution, resgate: applyRedemption, valor: applyValueUpdate }[kind];
  if (!aplicar) throw new Error("movimento_desconhecido");
  const { patch, entry } = aplicar(inv, value); // lança erro de validação antes de gravar qualquer coisa
  const { data: atualizada, error } = await supabase
    .from("investments").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", inv.id).select().single();
  if (error) throw error;
  const { error: entryError } = await supabase.from("investment_entries").insert({
    household_id: householdId, investment_id: inv.id, date: dateISO, ...entry,
  });
  if (entryError) {
    await supabase.from("investments")
      .update({ valor_aplicado: inv.valor_aplicado, valor_atual: inv.valor_atual }).eq("id", inv.id); // volta ao que era
    throw entryError;
  }
  return atualizada;
}

export async function deleteInvestment(supabase, id) {
  const { error } = await supabase.from("investments").delete().eq("id", id); // os movimentos saem junto (cascade)
  if (error) throw error;
}
