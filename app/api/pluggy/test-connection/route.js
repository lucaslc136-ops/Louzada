import { NextResponse } from "next/server";
import { getPluggyApiKey, fetchPluggyAccounts, fetchPluggyItem, mapPluggyAccountType, extractDayOfMonth } from "@/lib/pluggy/client";

// GET /api/pluggy/test-connection?itemId=... — só LÊ dados da Pluggy, não grava nada no nosso banco.
// Usado pra conferir se a conexão está ok e mostrar as contas antes de vincular qualquer coisa.
export async function GET(request) {
  const itemId = request.nextUrl.searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "Informe o itemId da conexão." }, { status: 400 });
  }

  try {
    const apiKey = await getPluggyApiKey();
    const item = await fetchPluggyItem(apiKey, itemId);
    const accounts = await fetchPluggyAccounts(apiKey, itemId);

    const preview = accounts.map((acc) => ({
      pluggyAccountId: acc.id,
      name: acc.name,
      marketingName: acc.marketingName,
      tipoSugerido: mapPluggyAccountType(acc),
      saldo: acc.balance,
      limite: acc.creditData?.creditLimit ?? null,
      diaFechamento: extractDayOfMonth(acc.creditData?.balanceCloseDate),
      diaVencimento: extractDayOfMonth(acc.creditData?.balanceDueDate),
    }));

    return NextResponse.json({
      conector: item.connector?.name || null,
      status: item.status,
      contas: preview,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
