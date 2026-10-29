// Supabase de mentira, em memória, só para testar a camada de dados. Imita o que importa:
// filtros, ordenação, intervalo (range), "single" e o corte de 1000 linhas por consulta.
export function createFakeSupabase(seed = {}) {
  const tables = { debts: [], transactions: [], ...structuredClone(seed) };
  const failures = [];
  const calls = [];
  let autoId = 0;

  function takeFailure(table, op) {
    const f = failures.find((x) => x.table === table && x.op === op && x.times > 0);
    if (!f) return null;
    f.times -= 1;
    return { message: `falha simulada em ${table}.${op}` };
  }

  class Query {
    constructor(table) {
      this.table = table; this.op = "select"; this.filters = []; this.orders = [];
      this.range_ = null; this.mode = null; this.returning = false; this.payload = null;
    }
    select() { if (this.op !== "select") this.returning = true; return this; }
    insert(p) { this.op = "insert"; this.payload = p; return this; }
    update(p) { this.op = "update"; this.payload = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
    in(col, arr) { this.filters.push((r) => arr.includes(r[col])); return this; }
    gte(col, val) { this.filters.push((r) => r[col] >= val); return this; }
    lte(col, val) { this.filters.push((r) => r[col] <= val); return this; }
    not(col, _op, val) { this.filters.push((r) => r[col] !== val); return this; }
    is(col, val) { this.filters.push((r) => (r[col] ?? null) === val); return this; }
    order(col, opts = {}) { this.orders.push({ col, asc: opts.ascending !== false }); return this; }
    range(a, b) { this.range_ = [a, b]; return this; }
    single() { this.mode = "single"; return this; }
    maybeSingle() { this.mode = "maybe"; return this; }
    then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }

    run() {
      calls.push({ table: this.table, op: this.op, range: this.range_ });
      const fail = takeFailure(this.table, this.op);
      if (fail) return { data: null, error: fail };
      const rows = tables[this.table] || (tables[this.table] = []);
      const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
      let data;
      if (this.op === "insert") {
        const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r) => ({ id: `${this.table}-${++autoId}`, ...r }));
        rows.push(...list);
        data = list;
      } else if (this.op === "update") {
        data = match();
        data.forEach((r) => Object.assign(r, this.payload));
      } else if (this.op === "delete") {
        const gone = new Set(match());
        tables[this.table] = rows.filter((r) => !gone.has(r));
        data = [...gone];
      } else {
        data = match();
        for (const { col, asc } of [...this.orders].reverse()) {
          data = [...data].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
        }
        if (this.range_) data = data.slice(this.range_[0], this.range_[1] + 1);
        else data = data.slice(0, 1000); // limite padrão do Supabase
      }
      data = structuredClone(data); // o Supabase real devolve cópias, nunca as linhas guardadas
      if (this.mode === "single") {
        if (data.length !== 1) return { data: null, error: { message: `single: ${data.length} linhas` } };
        return { data: data[0], error: null };
      }
      if (this.mode === "maybe") return { data: data[0] ?? null, error: null };
      return { data: this.op === "select" || this.returning ? data : null, error: null };
    }
  }

  return {
    tables, calls,
    failNext(table, op) { failures.push({ table, op, times: 1 }); },
    from(table) { return new Query(table); },
  };
}
