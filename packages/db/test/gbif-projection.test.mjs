import assert from "node:assert/strict";
import test from "node:test";

const { isPublicGbifRecordLicense, roundGbifPublicCoordinate } =
  await import("../dist/gbif-projection-repository.js");
const { isPubliclyUsableLicense } =
  await import("../dist/source-review-repository.js");

test("GBIF public projection rounds coordinates and preserves privacy", () => {
  assert.equal(roundGbifPublicCoordinate(-70.650123), -70.65);
  assert.equal(roundGbifPublicCoordinate(-33.450456), -33.45);
  assert.equal(
    isPublicGbifRecordLicense(
      "http://creativecommons.org/licenses/by/4.0/legalcode",
    ),
    true,
  );
  assert.equal(
    isPublicGbifRecordLicense(
      "http://creativecommons.org/licenses/by-nc-nd/4.0/",
    ),
    false,
  );
  assert.equal(
    isPubliclyUsableLicense(
      "http://creativecommons.org/licenses/by/4.0/legalcode",
    ),
    true,
  );
  assert.equal(
    isPubliclyUsableLicense("http://creativecommons.org/licenses/by-nc/4.0/"),
    false,
  );
});
