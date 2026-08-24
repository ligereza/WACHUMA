import assert from "node:assert/strict";
import test from "node:test";

import {
  echinopsisScrollExperience,
  interpolateScrollChapter,
  scrollChapterAt,
} from "../dist/index.js";

test("the public mobile experience is centered on Echinopsis pachanoi", () => {
  assert.equal(
    echinopsisScrollExperience.biologicalEntityPublicId,
    "biological-entity-echinopsis-pachanoi",
  );
  assert.equal(echinopsisScrollExperience.chapters.length, 7);
  assert.equal(echinopsisScrollExperience.chapters.at(-1)?.layer, "sources");
});

test("scroll progress resolves chapters and clamps at the ends", () => {
  assert.equal(scrollChapterAt(echinopsisScrollExperience, -1).id, "identity");
  assert.equal(scrollChapterAt(echinopsisScrollExperience, 1).id, "sources");
  const middle = interpolateScrollChapter(echinopsisScrollExperience, 0.2);
  assert.equal(middle.current.id, "cultivation");
  assert.equal(middle.next.id, "ecology");
  assert.ok(middle.localProgress >= 0 && middle.localProgress < 1);
});
