import assert from "node:assert/strict";
import test from "node:test";

import { toPersistablePageRecords } from "./import-pachanoi-page-harvest.mjs";

test("page harvest maps source records without page content", () => {
  const records = toPersistablePageRecords({
    sources: [
      {
        sourcePublicId: "page-test",
        sourceRecord: {
          source: "web-page",
          sourceRecordId: "test:1",
          sourceUrl: "https://example.test/page",
          retrievedAt: "2026-08-27T23:00:00.000Z",
          license: "license-pending",
          attribution: "Example",
          assertionType: "editorial_interpretation",
          rawPayload: { accessStatus: "fetched-metadata", metadata: {} },
          rawChecksum: "sha256:test",
          importerVersion: "test",
          status: "pending",
        },
      },
    ],
  });
  assert.deepEqual(records, [
    {
      source: "web-page",
      sourceRecordId: "test:1",
      sourceUrl: "https://example.test/page",
      retrievedAt: "2026-08-27T23:00:00.000Z",
      license: "license-pending",
      attribution: "Example",
      assertionType: "editorial_interpretation",
      rawPayload: { accessStatus: "fetched-metadata", metadata: {} },
      rawChecksum: "sha256:test",
      importerVersion: "test",
      status: "pending",
    },
  ]);
});

test("page importer refuses a body accidentally present in a harvest", () => {
  assert.throws(
    () =>
      toPersistablePageRecords({
        sources: [
          {
            sourcePublicId: "page-test",
            sourceRecord: {
              source: "web-page",
              sourceRecordId: "test:body",
              sourceUrl: "https://example.test/page",
              retrievedAt: "2026-08-27T23:00:00.000Z",
              license: "license-pending",
              attribution: "Example",
              assertionType: "editorial_interpretation",
              rawPayload: { body: "must not be stored" },
              importerVersion: "test",
              status: "pending",
            },
          },
        ],
      }),
    /contains page content/,
  );
});
