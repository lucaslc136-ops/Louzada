import { NextResponse } from "next/server";
import { getAuthedHousehold } from "@/lib/pluggy/auth-helper";
import { upsertBankConnection, linkAccountToPluggy } from "@/lib/data/bank-connections";

// POST /api/pluggy/link-item — grava a conexão bancária e, opcionalmente, já vincula contas
// nossas às contas da Pluggy nessa mesma chamada.
export async function POST(request) {
  const { supabase, user, householdId } = await getAuthedHousehold();
  if (!user || !householdId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const { itemId, connectorName, status, links } = body; // links: [{ accountId, pluggyAccountId }]

  if (!itemId) {
    return NextResponse.json({ error: "Informe o itemId." }, { status: 400 });
  }

  try {
    const connection = await upsertBankConnection(supabase, householdId, {
      pluggyItemId: itemId, connectorName, status,
    });

    if (Array.isArray(links)) {
      for (const link of links) {
        await linkAccountToPluggy(supabase, link.accountId, link.pluggyAccountId);
      }
    }

    return NextResponse.json({ connection });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
