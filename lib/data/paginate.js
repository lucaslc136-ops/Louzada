// O Supabase devolve no máximo 1000 linhas por consulta. Quando passa disso, ele simplesmente corta,
// sem avisar, e os saldos e totais calculados no navegador ficam errados. Este helper busca em
// páginas até acabar. "buildQuery" precisa devolver uma consulta NOVA a cada chamada e já ordenada
// de forma estável (por exemplo data e id), senão linhas podem repetir ou sumir entre páginas.
export async function fetchAllPages(buildQuery, pageSize = 1000, maxPages = 500) {
  const rows = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
  throw new Error("Registros demais para carregar de uma vez.");
}

// Quais external_id (lançamentos importados do banco) já existem. Consulta só os ids que chegaram
// agora, em blocos, em vez de baixar todos os já importados (que passaria de 1000 com o tempo).
export async function fetchExistingExternalIds(supabase, householdId, externalIds, chunkSize = 200) {
  const found = [];
  for (let i = 0; i < externalIds.length; i += chunkSize) {
    const chunk = externalIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("transactions")
      .select("external_id")
      .eq("household_id", householdId)
      .in("external_id", chunk);
    if (error) throw error;
    found.push(...data.map((r) => r.external_id));
  }
  return found;
}
