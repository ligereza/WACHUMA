import assert from "node:assert/strict";
import postgres from "../packages/db/node_modules/postgres/src/index.js";
import { getSourceReviewProposal } from "../packages/shared/dist/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for quality:source-review; this gate never falls back to fixtures.",
  );
}

const sql = postgres(databaseUrl, { max: 1 });
try {
  const rows = await sql`
    SELECT source_record_id, count(*)::text AS pending_rows
    FROM source_records
    JOIN data_sources ON data_sources.id = source_records.data_source_id
    WHERE source_records.status = 'pending'
      AND data_sources.provider_key = 'web-page'
    GROUP BY source_record_id
    ORDER BY source_record_id
  `;

  const uncovered = rows
    .filter(
      ({ source_record_id }) => !getSourceReviewProposal(source_record_id),
    )
    .map(({ source_record_id }) => source_record_id);
  assert.deepEqual(
    uncovered,
    [],
    `Every pending web-page source record needs a proposal: ${uncovered.join(", ")}`,
  );

  for (const { source_record_id } of rows) {
    const proposal = getSourceReviewProposal(source_record_id);
    assert.ok(proposal, `Missing proposal for ${source_record_id}`);
    assert.equal(proposal.sourceRecordId, source_record_id);
    assert.match(proposal.title, /\S/);
    assert.match(proposal.evidenceUrl, /^https?:\/\//);
    assert.match(proposal.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(proposal.supportedStatements.length > 0);
    assert.ok(proposal.notSupported.length > 0);
    assert.match(proposal.rationale, /\S/);
    assert.match(proposal.reviewerNote, /\S/);
    if (proposal.recommendedDecision === "accepted") {
      assert.equal(
        proposal.license.status,
        "confirmed-on-page",
        `${source_record_id} cannot recommend acceptance without confirmed license evidence`,
      );
    }
    if (proposal.recommendedDecision !== "accepted") {
      assert.match(proposal.rationale, /\S/);
      assert.match(proposal.reviewerNote, /\S/);
    }
  }

  const pendingRows = rows.reduce(
    (sum, row) => sum + Number(row.pending_rows),
    0,
  );
  console.log(
    JSON.stringify({
      valid: true,
      pendingRows,
      uniqueSourceRecords: rows.length,
      proposals: rows.length,
      uncovered,
    }),
  );
} finally {
  await sql.end({ timeout: 5 });
}
