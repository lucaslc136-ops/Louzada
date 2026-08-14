// FINANCING_ENGINE — cálculos de amortização. Nenhuma regra do MCMV entra aqui; esse motor só sabe
// fazer matemática de financiamento a partir de valor financiado, taxa e prazo.

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Converte taxa ANUAL efetiva em taxa MENSAL equivalente (juros compostos, não linear/12).
export function taxaAnualParaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

// SAC: amortização constante, juros e parcela decrescentes.
export function calcularSAC(valorFinanciado, taxaAnual, prazoMeses) {
  const taxaMensal = taxaAnualParaMensal(taxaAnual);
  const amortizacaoConstante = round2(valorFinanciado / prazoMeses);
  const tabela = [];
  let saldo = valorFinanciado;

  for (let mes = 1; mes <= prazoMeses; mes++) {
    const juros = round2(saldo * taxaMensal);
    // última parcela absorve a diferença de arredondamento pra saldo fechar em zero exato
    const amortizacao = mes === prazoMeses ? round2(saldo) : amortizacaoConstante;
    const parcela = round2(amortizacao + juros);
    saldo = round2(saldo - amortizacao);
    tabela.push({ mes, parcela, juros, amortizacao, saldoDevedor: Math.max(0, saldo) });
  }

  return {
    sistema: "SAC",
    taxaMensal,
    parcelaInicial: tabela[0].parcela,
    parcelaFinal: tabela[tabela.length - 1].parcela,
    totalPago: round2(tabela.reduce((s, r) => s + r.parcela, 0)),
    totalJuros: round2(tabela.reduce((s, r) => s + r.juros, 0)),
    tabela,
  };
}

// Price: parcela fixa, juros decrescente / amortização crescente.
export function calcularPrice(valorFinanciado, taxaAnual, prazoMeses) {
  const taxaMensal = taxaAnualParaMensal(taxaAnual);
  const parcelaFixa = taxaMensal === 0
    ? round2(valorFinanciado / prazoMeses)
    : round2((valorFinanciado * taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) / (Math.pow(1 + taxaMensal, prazoMeses) - 1));

  const tabela = [];
  let saldo = valorFinanciado;

  for (let mes = 1; mes <= prazoMeses; mes++) {
    const juros = round2(saldo * taxaMensal);
    let amortizacao = round2(parcelaFixa - juros);
    let parcela = parcelaFixa;
    if (mes === prazoMeses) {
      // última parcela fecha exatamente o saldo restante, absorvendo arredondamentos acumulados
      amortizacao = round2(saldo);
      parcela = round2(amortizacao + juros);
    }
    saldo = round2(saldo - amortizacao);
    tabela.push({ mes, parcela, juros, amortizacao, saldoDevedor: Math.max(0, saldo) });
  }

  return {
    sistema: "Price",
    taxaMensal,
    parcelaInicial: tabela[0].parcela,
    parcelaFinal: tabela[tabela.length - 1].parcela,
    totalPago: round2(tabela.reduce((s, r) => s + r.parcela, 0)),
    totalJuros: round2(tabela.reduce((s, r) => s + r.juros, 0)),
    tabela,
  };
}

export function calcularFinanciamento(sistema, valorFinanciado, taxaAnual, prazoMeses) {
  if (valorFinanciado <= 0 || prazoMeses <= 0) return null;
  return sistema === "SAC" ? calcularSAC(valorFinanciado, taxaAnual, prazoMeses) : calcularPrice(valorFinanciado, taxaAnual, prazoMeses);
}

export function agruparPorAno(tabela) {
  const anos = [];
  for (let i = 0; i < tabela.length; i += 12) {
    const bloco = tabela.slice(i, i + 12);
    anos.push({
      ano: Math.floor(i / 12) + 1,
      parcelaMedia: round2(bloco.reduce((s, r) => s + r.parcela, 0) / bloco.length),
      jurosTotal: round2(bloco.reduce((s, r) => s + r.juros, 0)),
      amortizacaoTotal: round2(bloco.reduce((s, r) => s + r.amortizacao, 0)),
      saldoFinal: bloco[bloco.length - 1].saldoDevedor,
    });
  }
  return anos;
}
