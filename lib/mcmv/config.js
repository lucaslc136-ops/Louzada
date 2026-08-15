// MCMV_CONFIG — configuração centralizada das regras do Minha Casa Minha Vida.
// Valores consolidados de fontes públicas de 2026 (não é a fonte oficial da Caixa) — marcar como
// "a validar" antes de qualquer uso real. Estrutura pensada pra atualizar sem tocar nos motores de cálculo.

export const MCMV_CONFIG = {
  atualizadoEm: "2026 (estimativa — validar contra fonte oficial CAIXA antes de produção)",
  faixas: [
    {
      id: 1,
      nome: "Faixa 1",
      rendaMin: 0,
      rendaMax: 3200,
      taxaAnualMin: 0.04,
      taxaAnualMax: 0.045,
      temSubsidio: true,
      subsidioMaximo: 55000,
      // subsídio decresce conforme a renda se aproxima do teto da faixa
      subsidioFn: (renda, rendaMin, rendaMax, subsidioMax) => {
        const posicao = (renda - rendaMin) / (rendaMax - rendaMin);
        return Math.max(0, Math.round(subsidioMax * (1 - posicao * 0.6)));
      },
      tetoImovel: 230000,
      pctMaxFinanciamento: 0.9,
      entradaMinimaPct: 0.0,
    },
    {
      id: 2,
      nome: "Faixa 2",
      rendaMin: 3200.01,
      rendaMax: 5000,
      taxaAnualMin: 0.045,
      taxaAnualMax: 0.07,
      temSubsidio: true,
      subsidioMaximo: 30000,
      subsidioFn: (renda, rendaMin, rendaMax, subsidioMax) => {
        const posicao = (renda - rendaMin) / (rendaMax - rendaMin);
        return Math.max(0, Math.round(subsidioMax * (1 - posicao * 0.7)));
      },
      tetoImovel: 270000,
      pctMaxFinanciamento: 0.85,
      entradaMinimaPct: 0.03,
    },
    {
      id: 3,
      nome: "Faixa 3",
      rendaMin: 5000.01,
      rendaMax: 9600,
      taxaAnualMin: 0.055,
      taxaAnualMax: 0.0816,
      temSubsidio: false,
      subsidioMaximo: 0,
      subsidioFn: () => 0,
      tetoImovel: 400000,
      pctMaxFinanciamento: 0.8,
      entradaMinimaPct: 0.05,
    },
    {
      id: 4,
      nome: "Faixa 4",
      rendaMin: 9600.01,
      rendaMax: 13000,
      taxaAnualMin: 0.105,
      taxaAnualMax: 0.105,
      temSubsidio: false,
      subsidioMaximo: 0,
      subsidioFn: () => 0,
      tetoImovel: 500000,
      pctMaxFinanciamento: 0.7,
      entradaMinimaPct: 0.1,
    },
  ],

  // Regras específicas por região — só Norte/Nordeste têm taxa reduzida hoje.
  regioes: {
    padrao: { label: "Sudeste, Sul, Centro-Oeste", ajusteTaxa: 0 },
    norteNordeste: { label: "Norte, Nordeste", ajusteTaxa: -0.005 },
  },

  // Estados agrupados por região — usado pra escolher o estado e já cair na região certa por baixo.
  estados: [
    { sigla: "AC", nome: "Acre", regiao: "norteNordeste" },
    { sigla: "AL", nome: "Alagoas", regiao: "norteNordeste" },
    { sigla: "AP", nome: "Amapá", regiao: "norteNordeste" },
    { sigla: "AM", nome: "Amazonas", regiao: "norteNordeste" },
    { sigla: "BA", nome: "Bahia", regiao: "norteNordeste" },
    { sigla: "CE", nome: "Ceará", regiao: "norteNordeste" },
    { sigla: "DF", nome: "Distrito Federal", regiao: "padrao" },
    { sigla: "ES", nome: "Espírito Santo", regiao: "padrao" },
    { sigla: "GO", nome: "Goiás", regiao: "padrao" },
    { sigla: "MA", nome: "Maranhão", regiao: "norteNordeste" },
    { sigla: "MT", nome: "Mato Grosso", regiao: "padrao" },
    { sigla: "MS", nome: "Mato Grosso do Sul", regiao: "padrao" },
    { sigla: "MG", nome: "Minas Gerais", regiao: "padrao" },
    { sigla: "PA", nome: "Pará", regiao: "norteNordeste" },
    { sigla: "PB", nome: "Paraíba", regiao: "norteNordeste" },
    { sigla: "PR", nome: "Paraná", regiao: "padrao" },
    { sigla: "PE", nome: "Pernambuco", regiao: "norteNordeste" },
    { sigla: "PI", nome: "Piauí", regiao: "norteNordeste" },
    { sigla: "RJ", nome: "Rio de Janeiro", regiao: "padrao" },
    { sigla: "RN", nome: "Rio Grande do Norte", regiao: "norteNordeste" },
    { sigla: "RS", nome: "Rio Grande do Sul", regiao: "padrao" },
    { sigla: "RO", nome: "Rondônia", regiao: "norteNordeste" },
    { sigla: "RR", nome: "Roraima", regiao: "norteNordeste" },
    { sigla: "SC", nome: "Santa Catarina", regiao: "padrao" },
    { sigla: "SP", nome: "São Paulo", regiao: "padrao" },
    { sigla: "SE", nome: "Sergipe", regiao: "norteNordeste" },
    { sigla: "TO", nome: "Tocantins", regiao: "norteNordeste" },
  ],

  imovelUsado: { permitido: true, ajusteCota: -0.05 }, // cota de financiamento 5 p.p. menor

  comprometimentoRenda: {
    limiteConfortavel: 0.25,
    limiteMaximo: 0.30,
  },

  prazoMaximoMeses: 420,
  prazoMinimoMeses: 60,
};

export function classificarFaixa(rendaFamiliar) {
  const faixa = MCMV_CONFIG.faixas.find((f) => rendaFamiliar >= f.rendaMin && rendaFamiliar <= f.rendaMax);
  if (!faixa) return null;
  const subsidio = faixa.temSubsidio ? faixa.subsidioFn(rendaFamiliar, faixa.rendaMin, faixa.rendaMax, faixa.subsidioMaximo) : 0;
  return { ...faixa, subsidioEstimado: subsidio };
}

export function estadoParaRegiao(siglaEstado) {
  const estado = MCMV_CONFIG.estados.find((e) => e.sigla === siglaEstado);
  return estado ? estado.regiao : "padrao";
}

export function taxaComRegiao(taxaAnual, regiaoKey) {
  const ajuste = MCMV_CONFIG.regioes[regiaoKey]?.ajusteTaxa || 0;
  return Math.max(0, taxaAnual + ajuste);
}
