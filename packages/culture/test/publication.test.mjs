import assert from "node:assert/strict";
import test from "node:test";

const { demoCulturalRelations, isPubliclyPublishableRelation } =
  await import("../dist/index.js");

test("restricted cultural knowledge is not publishable by default", () => {
  assert.equal(isPubliclyPublishableRelation(demoCulturalRelations[0]), false);
  assert.equal(
    isPubliclyPublishableRelation({
      accessLevel: "public",
      reviewStatus: "accepted",
      sensitivity: "sensitive",
    }),
    false,
  );
  assert.equal(
    isPubliclyPublishableRelation({
      accessLevel: "public",
      reviewStatus: "accepted",
      sensitivity: "normal",
    }),
    true,
  );
});
