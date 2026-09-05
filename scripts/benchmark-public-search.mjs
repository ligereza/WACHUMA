// Measures the actual public-search SQL against a synthetic corpus without
// persisting any benchmark rows. The search repository is exercised directly,
// its generated query is captured through postgres.js debug, and that exact
// query is replayed with EXPLAIN ANALYZE inside the same transaction.
//
// Only the claims branch is scaled here. That is intentional: it gives a
// repeatable lower-bound measurement without fabricating species, specimens,
// places, or cultural material. The endpoint integration test measures the
// complete query shape against the reviewed seed.
//
// Usage: DATABASE_URL=... pnpm bench:public-search -- --rows 200000

import { randomUUID } from "node:crypto";
import postgres from "../packages/db/node_modules/postgres/src/index.js";
import { createSearchRepository } from "../packages/db/dist/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for bench:public-search");
}

const rowsFlag = process.argv.indexOf("--rows");
const rows =
  rowsFlag === -1 ? 200_000 : Number.parseInt(process.argv[rowsFlag + 1], 10);
if (!Number.isInteger(rows) || rows < 1_000) {
  throw new Error("--rows must be an integer of at least 1000");
}

const needle = "pachanoi";
const runKey = `search-benchmark-${randomUUID()}`;
const observedSearchQueries = [];
const sql = postgres(databaseUrl, {
  max: 1,
  onnotice: () => {},
  debug: (_connection, query, parameters) => {
    if (query.includes("WITH search_params AS")) {
      observedSearchQueries.push({ query, parameters });
    }
  },
});

function planSummary(row) {
  const plan = row?.["QUERY PLAN"]?.[0];
  if (!plan) throw new Error("EXPLAIN returned no JSON plan");
  const nodeTypes = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node["Node Type"] === "string") {
      nodeTypes.push(node["Node Type"]);
    }
    for (const child of node.Plans ?? []) walk(child);
  };
  walk(plan.Plan);
  return {
    planningMs: Number(Number(plan["Planning Time"]).toFixed(2)),
    executionMs: Number(Number(plan["Execution Time"]).toFixed(2)),
    nodeTypes: [...new Set(nodeTypes)],
  };
}

class RollbackBenchmark extends Error {}

let report;
try {
  await sql.begin(async (transaction) => {
    const [entity] = await transaction`
      SELECT id
      FROM biological_entities
      WHERE public_id = 'biological-entity-echinopsis-pachanoi'
      LIMIT 1
    `;
    if (!entity) {
      throw new Error(
        "The reviewed pachanoi seed is required before running this benchmark",
      );
    }

    const [source] = await transaction`
      SELECT id
      FROM sources
      WHERE public_id = 'source-wachuma-demo-editorial'
      LIMIT 1
    `;
    if (!source) {
      throw new Error(
        "The reviewed demo source is required before running this benchmark",
      );
    }

    await transaction.unsafe(
      `
        INSERT INTO claims (
          public_id, subject_type, subject_id, predicate, object_text,
          assertion_type, evidence_level, source_id, visibility,
          license_uri, review_status
        )
        SELECT
          $1 || '-' || series::text,
          'biological_entity',
          $2::uuid,
          'search_benchmark',
          CASE WHEN series % 1000 = 0
            THEN 'Synthetic public claim about Echinopsis ${needle} ' || md5(series::text)
            ELSE 'Synthetic reviewed botanical claim ' || series::text || ' ' || md5(series::text)
          END,
          'editorial_interpretation',
          'reported',
          $3::uuid,
          'public',
          'WACHUMA-BENCHMARK',
          'accepted'
        FROM generate_series(1, $4::integer) AS series
      `,
      [runKey, entity.id, source.id, rows],
    );

    await transaction`ANALYZE claims`;
    const results = await createSearchRepository(transaction).searchPublic(
      needle,
      30,
    );
    const observedSearch = observedSearchQueries.at(-1);
    if (!observedSearch) {
      throw new Error("The public search query was not captured");
    }
    const [planRow] = await transaction.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${observedSearch.query}`,
      observedSearch.parameters,
    );
    report = {
      syntheticRows: rows,
      syntheticMatchRows: Math.floor(rows / 1000),
      returnedResults: results.length,
      plan: planSummary(planRow),
      rolledBack: true,
    };
    throw new RollbackBenchmark();
  });
} catch (error) {
  if (!(error instanceof RollbackBenchmark)) throw error;
} finally {
  await sql.end();
}

console.log(JSON.stringify(report, null, 2));
