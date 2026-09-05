import assert from "node:assert/strict";
import test from "node:test";

import {
  getSourceReviewProposal,
  sourceReviewProposals,
} from "../dist/index.js";

test("source review proposals cover the harvested stable records", () => {
  assert.equal(sourceReviewProposals.length, 10);
  assert.equal(
    new Set(sourceReviewProposals.map((proposal) => proposal.sourceRecordId))
      .size,
    sourceReviewProposals.length,
  );
  for (const proposal of sourceReviewProposals) {
    assert.equal(getSourceReviewProposal(proposal.sourceRecordId), proposal);
    assert.ok(proposal.supportedStatements.length > 0);
    assert.ok(proposal.notSupported.length > 0);
    assert.match(proposal.reviewerNote, /\S/);
    if (proposal.recommendedDecision === "accepted") {
      assert.equal(proposal.license.status, "confirmed-on-page");
    }
  }
});

test("duplicate harvest rows resolve to one stable editorial proposal", () => {
  const duplicateIds = [
    "scielo-pid:S0187-57792025000100601",
    "unprg-handle:20.500.12893/11487",
    "untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
    "utn-handle:123456789/7458",
  ];
  for (const sourceRecordId of duplicateIds) {
    assert.ok(getSourceReviewProposal(sourceRecordId));
  }
});
