import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPluggyApiKey, fetchPluggyTransactions, fetchPluggyAccountById } from "@/lib/pluggy/client";
import { mapPluggyTransactionToDraft, filterNewPluggyTransactions, findPossibleDuplicate } from "@/lib/finance/core";

// GET /api/cron/sync-banks — chamado uma vez por dia pela Vercel (vercel.json). Só a própria
// Vercel deve conseguir chamar isso de verdade, por isso a checagem do CRON_SECRET logo abaixo.
//
// Diferente da sincronização manual (que passa por uma tela de revisão antes de salvar), aqui
// os lançamentos já entram direto no banco, mas marcados com needs_review=true — a pessoa
// confirma a categoria depois, na aba Lançamentos, sem perder tempo tendo que clicar em
// "sincronizar" toda vez que abre o app.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resultado = { contasProcessadas: 0, importados: 0, erros: [] };

  const { data: contasVinculadas, error: contasError } = await supabase
    .from("accounts")
    .select("id, household_id, name, type, pluggy_account_id")
    .not("pluggy_account_id", "is", null);
  if (contasError) {
    return NextResponse.json({ error: contasError.message }, { status: 500 });
  }

  if (contasVinculadas.length === 0) {
    return NextResponse.json(resultado);
  }

  let apiKey;
  try {
    apiKey = await getPluggyApiKey();
  } catch (err) {
    return NextResponse.json({ error: `Falha ao autenticar na Pluggy: ${err.message}` }, { status: 502 });
  }

  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const conta of contasVinculadas) {
    try {
      const pluggyTxs = await fetchPluggyTransactions(apiKey, conta.pluggy_account_id, { dateFrom });

      const { data: existentes } = await supabase
        .from("transactions").select("external_id")
        .eq("household_id", conta.household_id).not("external_id", "is", null);
      const existingIds = (existentes || []).map((t) => t.external_id);
      const novas = filterNewPluggyTransactions(pluggyTxs, existingIds);

      if (novas.length > 0) {
        const { data: manuais } = await supabase
          .from("transactions").select("id, account_id, type, value, date, note")
          .eq("household_id", conta.household_id).eq("account_id", conta.id).is("external_id", null);

        const rows = novas.map((t) => {
          const draft = mapPluggyTransactionToDraft(t, conta.id);
          const duplicata = findPossibleDuplicate(draft, manuais || []);
          return {
            household_id: conta.household_id,
            type: draft.type,
            value: draft.value,
            date: draft.date,
            category_id: draft.categoryId,
            subcategory: draft.subcategory,
            account_id: draft.accountId,
            payment_method: draft.paymentMethod,
            note: draft.note,
            external_id: draft.externalId,
            source: "pluggy-cron",
            needs_review: true,
            possible_duplicate_of: duplicata?.id || null,
          };
        });

        const { error: insertError } = await supabase.from("transactions").insert(rows);
        if (insertError) throw insertError;
        resultado.importados += rows.length;
      }

      await supabase.from("bank_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("household_id", conta.household_id);

      // atualiza o saldo real do banco pra reconciliação (só "conta" — cartão tem semântica
      // de fatura, não saldo corrente, e mereceria um tratamento próprio).
      if (conta.type === "conta") {
        try {
          const pluggyAccount = await fetchPluggyAccountById(apiKey, conta.pluggy_account_id);
          await supabase.from("accounts")
            .update({ pluggy_balance: pluggyAccount.balance, pluggy_balance_updated_at: new Date().toISOString() })
            .eq("id", conta.id);
        } catch {
          // não bloqueia a sincronização se só a atualização do saldo falhar
        }
      }

      resultado.contasProcessadas++;
    } catch (err) {
      resultado.erros.push({ conta: conta.name, erro: err.message });
      // segue tentando as outras contas mesmo se uma falhar
    }
  }

  return NextResponse.json(resultado);
}
