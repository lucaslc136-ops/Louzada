import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/market/available — lista todo código de moeda/cripto que a AwesomeAPI conhece,
// pra alimentar a busca na tela de Investimentos. Guardado em cache por 1h no servidor.
//
// Formato real da API confirmado: um mapa direto código -> nome, ex:
// { "USD": "Dólar Americano", "ETH": "Ethereum", "BRL": "Real Brasileiro", ... }
let cache = null;
let cacheTimestamp = 0;
const CACHE_MS = 60 * 60 * 1000;
const MAX_ITENS = 500;

export async function GET() {
  if (cache && Date.now() - cacheTimestamp < CACHE_MS) {
    return NextResponse.json({ moedas: cache });
  }

  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/available/uniq", { cache: "no-store" });
    const data = await res.json();

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ moedas: [], error: "Formato inesperado da API." }, { status: 502 });
    }

    const moedas = [];
    for (const [code, nome] of Object.entries(data)) {
      if (typeof code !== "string" || typeof nome !== "string") continue;
      if (!/^[A-Z0-9]{2,15}$/.test(code)) continue; // blindagem: só código de moeda de verdade
      moedas.push({ code, nome });
      if (moedas.length >= MAX_ITENS) break;
    }

    moedas.sort((a, b) => a.code.localeCompare(b.code));

    if (moedas.length === 0) {
      return NextResponse.json({ moedas: [], error: "Lista vazia após processar a resposta da API." }, { status: 502 });
    }

    cache = moedas;
    cacheTimestamp = Date.now();
    return NextResponse.json({ moedas });
  } catch {
    return NextResponse.json({ moedas: [], error: "Não consegui buscar a lista agora." }, { status: 502 });
  }
}