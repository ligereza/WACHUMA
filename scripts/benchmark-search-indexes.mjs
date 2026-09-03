// Measures what a substring search over the public corpus costs before and
// after a trigram index, at a corpus size the project does not have yet.
//
// docs/quality/objective-audit-v0.1.md asks to observe public search
// performance "when the corpus stops being small". Today it is one species and
// seventeen sources, so the real tables cannot answer that question. This
// benchmark builds a throwaway schema, grows it to a chosen size, and times the
// same ILIKE predicate the search repository uses.
//
// It measures the mechanism, not the whole route: one column, one predicate.
// That is enough to decide whether an index is warranted, and honest about not
// being a benchmark of /api/v1/search.
//
// Usage: DATABASE_URL=... pnpm bench:search-indexes [--rows 200000]

// The database workspace owns the PostgreSQL client; the root scripts package
// intentionally does not duplicate that runtime dependency.
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for bench:search-indexes");
}

const rowsFlag = process.argv.indexOf("--rows");
const rows =
  rowsFlag === -1 ? 200_000 : Number.parseInt(process.argv[rowsFlag + 1], 10);
if (!Number.isFinite(rows) || rows < 1_000) {
  throw new Error("--rows must be an integer of at least 1000");
}

const schema = "search_benchmark";
const needle = "pachanoi";
const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

async function timedPlan(statement) {
  // EXPLAIN ANALYZE reports the server-side cost, so a slow client connection
  // cannot be mistaken for a slow query.
  const [row] = await sql.unsafe(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${statement}`,
  );
  const plan = row["QUERY PLAN"][0];
  const nodes = [];
  const walk = (node) => {
    nodes.push(node["Node Type"]);
    for (const child of node.Plans ?? []) walk(child);
  };
  walk(plan.Plan);
  return {
    executionMs: Number(plan["Execution Time"].toFixed(2)),
    nodeTypes: [...new Set(nodes)],
  };
}

async function medianPlan(statement, runs = 3) {
  const samples = [];
  let nodeTypes = [];
  for (let index = 0; index < runs; index += 1) {
    const result = await timedPlan(statement);
    samples.push(result.executionMs);
    nodeTypes = result.nodeTypes;
  }
  samples.sort((left, right) => left - right);
  return { executionMs: samples[Math.floor(samples.length / 2)], nodeTypes };
}

try {
  await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await sql.unsafe(`CREATE SCHEMA ${schema}`);
  await sql.unsafe(`
    CREATE TABLE ${schema}.claims (
      id bigserial PRIMARY KEY,
      object_text text NOT NULL
    )
  `);
  // One row in every thousand carries the needle, so the predicate is
  // selective the way a real search term is.
  await sql.unsafe(`
    INSERT INTO ${schema}.claims (object_text)
    SELECT CASE WHEN series % 1000 = 0
      THEN 'Registro editorial sobre Echinopsis ${needle} con procedencia ' || md5(series::text)
      ELSE 'Afirmación botánica revisada número ' || series || ' ' || md5(series::text)
    END
    FROM generate_series(1, ${rows}) AS series
  `);
  await sql.unsafe(`ANALYZE ${schema}.claims`);

  const statement = `SELECT count(*) FROM ${schema}.claims WHERE object_text ILIKE '%${needle}%'`;
  const before = await medianPlan(statement);

  await sql.unsafe(`
    CREATE INDEX claims_object_text_trgm_bench_idx
      ON ${schema}.claims USING gin (object_text gin_trgm_ops)
  `);
  await sql.unsafe(`ANALYZE ${schema}.claims`);
  const after = await medianPlan(statement);

  const [{ count }] = await sql.unsafe(
    `SELECT count(*)::int AS count FROM ${schema}.claims WHERE object_text ILIKE '%${needle}%'`,
  );

  console.log(
    JSON.stringify(
      {
        rows,
        matches: count,
        withoutIndex: before,
        withTrigramIndex: after,
        speedup: Number((before.executionMs / after.executionMs).toFixed(1)),
      },
      null,
      2,
    ),
  );
} finally {
  await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await sql.end();
}
