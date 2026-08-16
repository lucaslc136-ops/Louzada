import { NextResponse } from "next/server";
import { getAuthedHousehold } from "@/lib/pluggy/auth-helper";

// POST /api/pluggy/sync-commit — salva de verdade as transações que a pessoa revisou e
// confirmou na tela anterior. Só aceita o formato exato de "draft" gerado pelo sync-preview.
export async function POST(request) {
  const { supabase, user, householdId } = await getAuthedHousehold();
  if (!user || !householdId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { drafts } = await request.json();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: "Nenhum lançamento pra importar." }, { status: 400 });
  }

  const rows = drafts.map((d) => ({
    household_id: householdId,
    type: d.type,
    value: d.value,
    date: d.date,
    category_id: d.categoryId,
    subcategory: d.subcategory,
    account_id: d.accountId,
    payment_method: d.paymentMethod || "Importado do banco",
    note: d.note || "",
    external_id: d.externalId,
    source: "pluggy",
    possible_duplicate_of: d.possibleDuplicate?.id || null,
  }));

  try {
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) throw error;
    return NextResponse.json({ importados: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
