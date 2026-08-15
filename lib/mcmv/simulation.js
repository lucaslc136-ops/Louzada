// ELIGIBILITY_ENGINE — usa só o MCMV_CONFIG pra classificar a faixa; nenhum número solto aqui.
import { MCMV_CONFIG, classificarFaixa, taxaComRegiao, estadoParaRegiao } from "./config";
import { round2, taxaAnualParaMensal, calcularFinanciamento } from "./financing";

export function avaliarElegibilidade({ renda, estado = "SP", imovelUsado = false }) {
  const faixa = classificarFaixa(renda);
  if (!faixa) {
    return { enquadrado: false, motivo: renda > MCMV_CONFIG.faixas[MCMV_CONFIG.faixas.length - 1].rendaMax ? "acima_teto" : "renda_invalida" };
  }
  const taxaBase = (faixa.taxaAnualMin + faixa.taxaAnualMax) / 2;
  const regiao = estadoParaRegiao(estado);
  const taxaAnual = taxaComRegiao(taxaBase, regiao);
  let cota = faixa.pctMaxFinanciamento;
  if (imovelUsado) cota = Math.max(0, cota + MCMV_CONFIG.imovelUsado.ajusteCota);

  return {
    enquadrado: true,
    faixa: faixa.nome,
    faixaId: faixa.id,
    rendaMin: faixa.rendaMin,
    rendaMax: faixa.rendaMax,
    taxaAnualMin: faixa.taxaAnualMin,
    taxaAnualMax: faixa.taxaAnualMax,
    taxaAnualEstimada: taxaAnual,
    taxaAnualEstimadaPct: round2(taxaAnual * 100),
    temSubsidio: faixa.temSubsidio,
    subsidioEstimado: faixa.subsidioEstimado,
    tetoImovel: faixa.tetoImovel,
    pctMaxFinanciamento: cota,
    entradaMinimaPct: faixa.entradaMinimaPct,
  };
}

// SIMULATION_ENGINE — monta os cenários completos a partir dos dados informados.

export function comprometimentoRenda(parcela, renda) {
  if (!renda) return { pct: 0, nivel: "indefinido" };
  const pct = round2((parcela / renda) * 100);
  let nivel = "confortavel";
  if (pct > MCMV_CONFIG.comprometimentoRenda.limiteMaximo * 100) nivel = "incompativel";
  else if (pct > MCMV_CONFIG.comprometimentoRenda.limiteConfortavel * 100) nivel = "limite";
  return { pct, nivel };
}

// Simulação direta: usuário informa imóvel + entrada + FGTS -> calcula parcela e tudo mais.
export function simularFinanciamento({ renda, valorImovel, entrada, fgts = 0, prazoMeses, sistema, estado = "SP", imovelUsado = false }) {
  const elegibilidade = avaliarElegibilidade({ renda, estado, imovelUsado });
  const entradaTotal = round2(entrada + fgts + (elegibilidade.enquadrado ? elegibilidade.subsidioEstimado || 0 : 0));
  const valorFinanciado = round2(Math.max(0, valorImovel - entradaTotal));
  const taxaAnual = elegibilidade.enquadrado ? elegibilidade.taxaAnualEstimada : 0.10; // fora do MCMV, taxa de mercado ilustrativa
  const financiamento = calcularFinanciamento(sistema, valorFinanciado, taxaAnual, prazoMeses);
  const comprometimento = financiamento ? comprometimentoRenda(financiamento.parcelaInicial, renda) : null;

  return { elegibilidade, entradaTotal, valorFinanciado, taxaAnual, financiamento, comprometimento };
}

// Simulação reversa 1: "quanto eu consigo comprar" — dado renda + entrada + FGTS + prazo, estima o
// valor máximo de imóvel usando o limite de comprometimento de renda como restrição.
export function simularQuantoPossoComprar({ renda, entrada, fgts = 0, prazoMeses, sistema, estado = "SP", imovelUsado = false }) {
  const elegibilidade = avaliarElegibilidade({ renda, estado, imovelUsado });
  if (!elegibilidade.enquadrado) return { elegibilidade, valorMaximoImovel: null };

  const parcelaMaxima = round2(renda * MCMV_CONFIG.comprometimentoRenda.limiteMaximo);
  const taxaAnual = elegibilidade.taxaAnualEstimada;
  const taxaMensal = taxaAnualParaMensal(taxaAnual);

  // busca binária pelo valor financiado cuja 1ª parcela (SAC, pior caso) bate na parcela máxima
  let low = 0, high = elegibilidade.tetoImovel * 2, valorFinanciadoMax = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const financ = calcularFinanciamento(sistema, mid, taxaAnual, prazoMeses);
    const primeiraParcela = financ ? financ.parcelaInicial : 0;
    if (primeiraParcela <= parcelaMaxima) { valorFinanciadoMax = mid; low = mid; } else { high = mid; }
  }
  valorFinanciadoMax = round2(valorFinanciadoMax);

  const entradaDisponivel = round2(entrada + fgts + (elegibilidade.subsidioEstimado || 0));
  let valorMaximoImovel = round2(valorFinanciadoMax + entradaDisponivel);
  const capadoPeloTeto = valorMaximoImovel > elegibilidade.tetoImovel;
  if (capadoPeloTeto) valorMaximoImovel = elegibilidade.tetoImovel;

  const financiamentoFinal = calcularFinanciamento(sistema, Math.min(valorFinanciadoMax, valorMaximoImovel - entradaDisponivel), taxaAnual, prazoMeses);

  return {
    elegibilidade, parcelaMaxima, entradaDisponivel, valorMaximoImovel, capadoPeloTeto,
    valorFinanciado: financiamentoFinal ? round2(valorMaximoImovel - entradaDisponivel) : 0,
    financiamento: financiamentoFinal,
  };
}

// Simulação reversa 2: "quanto posso pagar por mês" — dado uma parcela-alvo, estima o valor financiável.
export function simularPorParcelaMaxima({ renda, parcelaMaxima, entrada, fgts = 0, prazoMeses, sistema, estado = "SP", imovelUsado = false }) {
  const elegibilidade = avaliarElegibilidade({ renda, estado, imovelUsado });
  const taxaAnual = elegibilidade.enquadrado ? elegibilidade.taxaAnualEstimada : 0.10;

  let low = 0, high = 5000000, valorFinanciadoMax = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const financ = calcularFinanciamento(sistema, mid, taxaAnual, prazoMeses);
    const primeiraParcela = financ ? financ.parcelaInicial : 0;
    if (primeiraParcela <= parcelaMaxima) { valorFinanciadoMax = mid; low = mid; } else { high = mid; }
  }
  valorFinanciadoMax = round2(valorFinanciadoMax);
  const entradaTotal = round2(entrada + fgts + (elegibilidade.enquadrado ? elegibilidade.subsidioEstimado || 0 : 0));
  const valorImovelEstimado = round2(valorFinanciadoMax + entradaTotal);
  const financiamento = calcularFinanciamento(sistema, valorFinanciadoMax, taxaAnual, prazoMeses);

  return { elegibilidade, valorFinanciadoMax, entradaTotal, valorImovelEstimado, financiamento };
}
