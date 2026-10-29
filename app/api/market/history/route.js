import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/market/history?code=USD&days=30
// Devolve o histórico de fechamento diário de uma moeda/cripto contra o Real,
// pra alimentar o gráfico na tela de Investimentos.
const cache = new Map();
const CACHE_MS = 30 * 60 * 1000; // 30 minutos — histórico diário não muda a cada segundo

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").toUpperCase().trim();
  const diasPedidos = parseInt(searchParams.get("days") || "30", 10);
  const dias = Math.min(Math.max(Number.isNaN(diasPedidos) ? 30 : diasPedidos, 2), 180);

  if (!/^[A-Z0-9]{2,6}$/.test(code)) {
    return NextResponse.json({ historico: [], error: "Código inválido." }, { status: 400 });
  }

  const cacheKey = `${code}-${dias}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_MS) {
    return NextResponse.json({ historico: cached.data });
  }

  try {
    const res = await fetch(`https://economia.awesomeapi.com.br/json/daily/${code}-BRL/${dias}`, { cache: "no-store" });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ historico: [], error: "Sem histórico disponível pra esse código." }, { status: 502 });
    }

    // A API devolve do dia mais recente pro mais antigo — invertemos pra ordem
    // cronológica (mais antigo primeiro), que é como um gráfico de linha se lê.
    const historico = data
      .map((d) => ({
        data: d.timestamp
          ? new Date(Number(d.timestamp) * 1000).toISOString().slice(0, 10)
          : (d.create_date || "").slice(0, 10),
        valor: Number(d.bid),
      }))
      .filter((d) => d.data && !Number.isNaN(d.valor))
      .reverse();

    if (historico.length === 0) {
      return NextResponse.json({ historico: [], error: "Não consegui interpretar o histórico." }, { status: 502 });
    }

    cache.set(cacheKey, { data: historico, timestamp: Date.now() });
    return NextResponse.json({ historico });
  } catch {
    return NextResponse.json({ historico: [], error: "Não consegui buscar o histórico agora." }, { status: 502 });
  }
}
