import { NextResponse } from "next/server";
// Sem isso, o Next.js pode tratar essa rota como estática e cacheá-la desde o build — servindo
// sempre a MESMA cotação "congelada" de quando o site foi publicado, em vez de buscar de novo
// a cada visita. "force-dynamic" garante que ela roda de verdade, toda vez.
export const dynamic = "force-dynamic";

const PADRAO = ["USD", "EUR", "BTC"];

// GET /api/market/quotes?codes=USD,EUR,BTC,ETH — dado público, sem segredo nenhum envolvido.
// Passa pelo nosso servidor só pra evitar qualquer problema de CORS chamando direto do navegador.
// "codes" é opcional — sem ele, usa USD/EUR/BTC. Aceita qualquer código que a AwesomeAPI suporte.
//
// Cada moeda é buscada de forma INDEPENDENTE (uma chamada por código, todas em paralelo). Antes,
// era uma única chamada combinada pra todos os códigos de uma vez — o que significa que se UM
// código inválido ou não suportado fosse adicionado (ex: via busca), a resposta inteira podia
// falhar, derrubando até USD/EUR/BTC junto. Agora, se uma moeda falhar, só ela fica sem valor —
// as outras continuam aparecendo normalmente.
export async function GET(request) {
  const codesParam = request.nextUrl.searchParams.get("codes");
  const codes = codesParam
    ? [...new Set(codesParam.split(",").map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9-]{2,12}$/.test(c)))].slice(0, 20)
    : PADRAO;

  const [cambioResults, selicRes, cdiRes] = await Promise.all([
    Promise.allSettled(
      codes.map((code) =>
        fetch(`https://economia.awesomeapi.com.br/json/last/${code}-BRL`, { cache: "no-store" })
          .then((r) => r.json())
          .then((data) => ({ code, data }))
      )
    ),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null),
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null),
  ]);

  // A série 12 do Banco Central vem em taxa DIÁRIA (ex: 0,05%), não anualizada — precisa
  // compor os 252 dias úteis do ano pra virar a taxa "% a.a." que todo mundo reconhece.
  let cdiAnualizado = null;
  if (cdiRes?.[0]?.valor) {
    const diaria = Number(cdiRes[0].valor) / 100;
    cdiAnualizado = (Math.pow(1 + diaria, 252) - 1) * 100;
  }

  const cotacoes = {};
  for (const code of codes) {
    const resultado = cambioResults.find((r) => r.status === "fulfilled" && r.value?.code === code);
    const chave = `${code}BRL`;
    const item = resultado?.value?.data?.[chave];
    cotacoes[code] = item
      ? { valor: Number(item.bid), variacaoPct: Number(item.pctChange), nome: item.name }
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