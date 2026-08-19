import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/market/available — lista todo código de moeda/cripto que a AwesomeAPI conhece,
// pra alimentar a busca na tela de Investimentos. Guardado em cache por 1h no servidor
// (essa lista muda raramente), não precisa buscar de novo a cada visita.
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

    if (!data || typeof data !== "object") {
      return NextResponse.json({ moedas: [], error: "Formato inesperado da API." }, { status: 502 });
    }

    // A API devolve PARES, tipo "USD-BRL", "USD-BRLT" (turismo), "USD-BRLPTAX" (PTAX).
    // A gente só quer o código da moeda em si (ex: "USD"), cotado contra o Real padrão
    // (pares terminados em "-BRL"), pra alimentar a busca e bater com o que a rota de
    // cotações (/api/market/quotes) já usa.
    const vistos = new Set();
    const moedas = [];

    for (const [par, nome] of Object.entries(data)) {
      if (typeof par !== "string" || !par.endsWith("-BRL")) continue;

      const code = par.slice(0, -4); // remove o "-BRL" do final
      if (!/^[A-Z0-9]{2,6}$/.test(code)) continue; // blindagem: só código de moeda de verdade
      if (code === "BRL" || vistos.has(code)) continue;
      if (moedas.length >= MAX_ITENS) break;

      vistos.add(code);
      const nomeExibicao = typeof nome === "string" ? nome.split("/")[0].trim() : code;
      moedas.push({ code, nome: nomeExibicao });
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
