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
    // formato: { "USD": "Dólar Americano", "BTC": "Bitcoin", ... }
    const moedas = Object.entries(data)
      .filter(([code]) => code !== "BRL") // não faz sentido cotar Real contra Real
      .map(([code, nome]) => ({ code, nome }))
      .sort((a, b) => a.code.localeCompare(b.code));
    cache = moedas;
    cacheTimestamp = Date.now();
    return NextResponse.json({ moedas });
  } catch {
    return NextResponse.json({ moedas: [], error: "Não consegui buscar a lista agora." }, { status: 502 });
  }
}
