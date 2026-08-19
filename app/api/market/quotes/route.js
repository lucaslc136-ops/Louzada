import { NextResponse } from "next/server";

// Sem isso, o Next.js pode tratar essa rota como estática e cacheá-la desde o build — servindo
// sempre a MESMA cotação "congelada" de quando o site foi publicado, em vez de buscar de novo
// a cada visita. "force-dynamic" garante que ela roda de verdade, toda vez.
export const dynamic = "force-dynamic";

const PADRAO = ["USD", "EUR", "BTC"];

// GET /api/market/quotes?codes=USD,EUR,BTC,ETH — dado público, sem segredo nenhum envolvido.
// Passa pelo nosso servidor só pra evitar qualquer problema de CORS chamando direto do navegador.
// "codes" é opcional — sem ele, usa USD/EUR/BTC. Aceita qualquer código que a AwesomeAPI suporte
// (mais de 150 moedas, incluindo várias criptos), consultado dinamicamente.
//
// Cada fonte é buscada de forma independente (Promise.allSettled) — se uma falhar (a
// AwesomeAPI ou o Banco Central ficarem fora do ar, por exemplo), as outras ainda aparecem,
// em vez de tudo virar erro por causa de uma fonte só.
export async function GET(request) {
  const codesParam = request.nextUrl.searchParams.get("codes");
  const codes = codesParam ? codesParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) : PADRAO;
  const pares = codes.map((c) => `${c}-BRL`).join(",");

  const [cambioResult, selicResult, cdiResult] = await Promise.allSettled([
    fetch(`https://economia.awesomeapi.com.br/last/${pares}`, { cache: "no-store" }).then((r) => r.json()),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { cache: "no-store" }).then((r) => r.json()),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json", { cache: "no-store" }).then((r) => r.json()),
  ]);

  const cambio = cambioResult.status === "fulfilled" ? cambioResult.value : {};
  const selicRes = selicResult.status === "fulfilled" ? selicResult.value : null;
  const cdiRes = cdiResult.status === "fulfilled" ? cdiResult.value : null;

  // A série 12 do Banco Central vem em taxa DIÁRIA (ex: 0,05%), não anualizada — precisa
  // compor os 252 dias úteis do ano pra virar a taxa "% a.a." que todo mundo reconhece.
  let cdiAnualizado = null;
  if (cdiRes?.[0]?.valor) {
    const diaria = Number(cdiRes[0].valor) / 100;
    cdiAnualizado = (Math.pow(1 + diaria, 252) - 1) * 100;
  }

  const cotacoes = {};
  for (const code of codes) {
    const chave = `${code}BRL`;
    cotacoes[code] = cambio[chave]
      ? { valor: Number(cambio[chave].bid), variacaoPct: Number(cambio[chave].pctChange), nome: cambio[chave].name }
      : null;
  }

  return NextResponse.json({
    atualizadoEm: new Date().toISOString(),
    cotacoes,
    taxas: {
      selic: selicRes?.[0] ? { valor: Number(selicRes[0].valor), data: selicRes[0].data } : null,
      cdi: cdiAnualizado != null ? { valor: cdiAnualizado, data: cdiRes[0].data } : null,
    },
  });
}
