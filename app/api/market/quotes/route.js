import { NextResponse } from "next/server";

// GET /api/market/quotes — dado público, sem segredo nenhum envolvido. Passa pelo nosso
// servidor só pra evitar qualquer problema de CORS chamando direto do navegador.
export async function GET() {
  try {
    const [cambio, selicRes, cdiRes] = await Promise.all([
      fetch("https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL").then((r) => r.json()),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json").then((r) => r.json()),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json").then((r) => r.json()),
    ]);

    return NextResponse.json({
      atualizadoEm: new Date().toISOString(),
      cambio: {
        usd: cambio.USDBRL ? { valor: Number(cambio.USDBRL.bid), variacaoPct: Number(cambio.USDBRL.pctChange) } : null,
        eur: cambio.EURBRL ? { valor: Number(cambio.EURBRL.bid), variacaoPct: Number(cambio.EURBRL.pctChange) } : null,
        btc: cambio.BTCBRL ? { valor: Number(cambio.BTCBRL.bid), variacaoPct: Number(cambio.BTCBRL.pctChange) } : null,
      },
      taxas: {
        selic: selicRes?.[0] ? { valor: Number(selicRes[0].valor), data: selicRes[0].data } : null,
        cdi: cdiRes?.[0] ? { valor: Number(cdiRes[0].valor), data: cdiRes[0].data } : null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Não consegui buscar as cotações agora. Tenta de novo em instantes." }, { status: 502 });
  }
}
