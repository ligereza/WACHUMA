import assert from "node:assert/strict";
import test from "node:test";

import { validateMarkdown } from "./validate-markdown-structure.mjs";

test("markdown structure rejects orphan content and heading jumps", () => {
  const errors = validateMarkdown("orphan\n\n# Root\n### Skipped\nBody\n");
  assert.equal(errors.length, 2);
  assert.match(errors[0], /content appears before any heading/);
  assert.match(errors[1], /heading level jumps/);
});

test("markdown structure rejects an empty section", () => {
  const errors = validateMarkdown("# Root\nBody\n\n## Empty\n\n# Next\nBody\n");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /heading has no body: Empty/);
});
