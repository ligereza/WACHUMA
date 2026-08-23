import assert from "node:assert/strict";
import test from "node:test";

import { buildLineageTree, validateLineageAcyclic } from "../dist/index.js";

test("lineage supports two parents for a cross without duplicate edges", () => {
  const tree = buildLineageTree([
    { relationshipType: "parent_of", parentId: "a", childId: "c" },
    { relationshipType: "parent_of", parentId: "b", childId: "c" },
    { relationshipType: "cross_of", parentId: "a", childId: "c" },
  ]);

  assert.deepEqual(tree.roots, ["a", "b"]);
  assert.deepEqual(tree.nodes.find((node) => node.id === "c")?.parents, [
    "a",
    "b",
  ]);
});

test("lineage rejects cycles before rendering a tree", () => {
  const relationships = [
    { relationshipType: "parent_of", parentId: "a", childId: "b" },
    { relationshipType: "clone_of", parentId: "b", childId: "a" },
  ];

  assert.equal(validateLineageAcyclic(relationships).length, 1);
  assert.throws(() => buildLineageTree(relationships), /cycle detected/);
});
