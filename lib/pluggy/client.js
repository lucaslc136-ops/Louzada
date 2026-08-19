// Cliente da API da Pluggy. NUNCA importar isso em código que roda no navegador — usa
// PLUGGY_CLIENT_SECRET, que só pode existir no servidor. Formato de cada endpoint conferido
// direto na documentação oficial (docs.pluggy.ai) antes de escrever isso.

const BASE_URL = "https://api.pluggy.ai";

// A API key expira em 2h — pedimos uma nova a cada chamada de sincronização (não guardamos
// em cache entre requisições serverless, que são efêmeras de qualquer forma).
export async function getPluggyApiKey() {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configurados no servidor.");
  }
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao autenticar na Pluggy (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.apiKey;
}

async function pluggyGet(path, apiKey) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erro na Pluggy (${res.status}) em ${path}: ${body}`);
  }
  return res.json();
}

// Busca o status/dados básicos de uma conexão (item) específica.
export async function fetchPluggyItem(apiKey, itemId) {
  return pluggyGet(`/items/${itemId}`, apiKey);
}

// Busca todas as contas (correntes, poupança, cartões) de uma conexão.
export async function fetchPluggyAccounts(apiKey, itemId) {
  const data = await pluggyGet(`/accounts?itemId=${itemId}`, apiKey);
  return data.results;
}

// Busca só UMA conta pelo ID dela — usado pra atualizar o saldo real do banco sem precisar
// saber a conexão (item) inteira, só o id da conta que já guardamos.
export async function fetchPluggyAccountById(apiKey, pluggyAccountId) {
  return pluggyGet(`/accounts/${pluggyAccountId}`, apiKey);
}

// Busca transações de uma conta específica, com paginação por cursor. Retorna TODAS as
// páginas de uma vez (uso interno de sincronização, não uma tela paginada pro usuário).
export async function fetchPluggyTransactions(apiKey, accountId, { dateFrom, dateTo } = {}) {
  let all = [];
  let query = `accountId=${accountId}`;
  if (dateFrom) query += `&dateFrom=${dateFrom}`;
  if (dateTo) query += `&dateTo=${dateTo}`;
  let next = `/v2/transactions?${query}`;
  let guard = 0;
  while (next && guard < 50) { // guarda de segurança pra nunca entrar em loop infinito
    const data = await pluggyGet(next, apiKey);
    all = all.concat(data.results);
    next = data.next ? `/v2/transactions?${data.next.replace(/^\?/, "")}` : null;
    guard++;
  }
  return all;
}

// Mapeia o tipo/subtipo de conta da Pluggy pro nosso schema (conta | cartao).
export function mapPluggyAccountType(pluggyAccount) {
  return pluggyAccount.type === "CREDIT" ? "cartao" : "conta";
}

// Extrai só o dia do mês de uma data ISO da Pluggy (ex: fechamento/vencimento de fatura).
export function extractDayOfMonth(isoDateString) {
  if (!isoDateString) return null;
  return new Date(isoDateString).getUTCDate();
}
