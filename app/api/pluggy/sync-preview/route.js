import { NextResponse } from "next/server";
import { getAuthedHousehold } from "@/lib/pluggy/auth-helper";
import { getPluggyApiKey, fetchPluggyTransactions } from "@/lib/pluggy/client";
import { mapPluggyTransactionToDraft, filterNewPluggyTransactions, findPossibleDuplicate } from "@/lib/finance/core";

// POST /api/pluggy/sync-preview — busca transações novas da conta vinculada, SEM salvar nada
// ainda. Devolve uma lista pra pessoa revisar/ajustar categoria antes de confirmar.
export async function POST(request) {
  const { supabase, user, householdId } = await getAuthedHousehold();
  if (!user || !householdId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { accountId } = await request.json();
  if (!accountId) {
    return NextResponse.json({ error: "Informe o accountId." }, { status: 400 });
  }

  // confirma que essa conta é da família de quem está chamando, e pega o pluggy_account_id dela
  const { data: account, error: accError } = await supabase
    .from("accounts")
    .select("id, name, household_id, pluggy_account_id")
    .eq("id", accountId)
    .maybeSingle();

  if (accError || !account || account.household_id !== householdId) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }
  if (!account.pluggy_account_id) {
    return NextResponse.json({ error: "Essa conta ainda não está vinculada a nenhuma conta do banco." }, { status: 400 });
  }

  try {
    const apiKey = await getPluggyApiKey();

    // primeira sincronização: últimos 90 dias. Isso é intencionalmente simples por enquanto —
    // não olhamos last_synced_at ainda, pra sempre trazer uma janela recente e não perder nada.
    const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const pluggyTxs = await fetchPluggyTransactions(apiKey, account.pluggy_account_id, { dateFrom });

    const { data: existing, error: existingError } = await supabase
      .from("transactions")
      .select("external_id")
      .eq("household_id", householdId)
      .not("external_id", "is", null);
    if (existingError) throw existingError;

    const existingIds = existing.map((t) => t.external_id);
    const novas = filterNewPluggyTransactions(pluggyTxs, existingIds);
    const drafts = novas.map((t) => mapPluggyTransactionToDraft(t, accountId));

    // pra detectar duplicata, olha os lançamentos digitados à mão (sem external_id) da mesma
    // conta, num período um pouco mais largo que a janela de comparação (3 dias pra cada lado).
    const { data: manuais, error: manuaisError } = await supabase
      .from("transactions")
      .select("id, account_id, type, value, date, note")
      .eq("household_id", householdId)
      .eq("account_id", accountId)
      .is("external_id", null);
    if (manuaisError) throw manuaisError;

    for (const d of drafts) {
      d.possibleDuplicate = findPossibleDuplicate(d, manuais);
    }

    return NextResponse.json({ accountName: account.name, total: pluggyTxs.length, novas: drafts.length, drafts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
