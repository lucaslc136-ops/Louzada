import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/market/available — lista todo código de moeda/cripto que a AwesomeAPI conhece
// (mais de 150), pra alimentar a busca na tela de Investimentos. Guardado em cache por 1h no
// servidor (essa lista muda raramente), não precisa buscar de novo a cada visita.
let cache = null;
let cacheTimestamp = 0;
const CACHE_MS = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheTimestamp < CACHE_MS) {
    return NextResponse.json({ moedas: cache });
  }

  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/available/uniq", { cache: "no-store" });
    const data = await res.json();

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ moedas: [], error: "Formato inesperado da lista de moedas." }, { status: 502 });
    }

    // Blindagem: só aceita entradas que parecem mesmo um código de moeda/cripto (2 a 6 letras/
    // números) — se a API um dia devolver pares (tipo "USD-BRL") em vez de códigos soltos, ou
    // qualquer coisa fora do esperado, isso é descartado em vez de quebrar a tela. Também limita
    // o total, por segurança, mesmo que a lista real tenha mais de 150 itens.
    const CODE_PATTERN = /^[A-Z0-9]{2,6}$/;
    const moedas = Object.entries(data)
      .filter(([code, nome]) => code !== "BRL" && CODE_PATTERN.test(code) && typeof nome === "string")
      .slice(0, 500)
      .map(([code, nome]) => ({ code, nome }))
      .sort((a, b) => a.code.localeCompare(b.code));

    cache = moedas;
    cacheTimestamp = Date.now();
    return NextResponse.json({ moedas });
  } catch {
    return NextResponse.json({ moedas: [], error: "Não consegui buscar a lista agora." }, { status: 502 });
  }
}
