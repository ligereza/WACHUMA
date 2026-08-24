import assert from "node:assert/strict";
import postgres from "postgres";
import test from "node:test";

const run = process.env.RUN_DB_INTEGRATION === "1";
const databaseUrl = process.env.DATABASE_URL;

const { projectPublicInaturalistCoordinates } =
  await import("../dist/inaturalist-projection-repository.js");

test("iNaturalist never projects obscured or private coordinates", () => {
  assert.deepEqual(
    projectPublicInaturalistCoordinates({
      geoprivacy: "open",
      taxon_geoprivacy: "open",
      geojson: { type: "Point", coordinates: [-71.308512, -33.745195] },
    }),
    [-71.31, -33.75],
  );
  assert.equal(
    projectPublicInaturalistCoordinates({
      geoprivacy: "obscured",
      taxon_geoprivacy: "open",
      geojson: { type: "Point", coordinates: [-71.308512, -33.745195] },
    }),
    undefined,
  );
});

test(
  "iNaturalist projection preserves per-record provenance and geoprivacy",
  { skip: !run || !databaseUrl },
  async () => {
    const { createImportRepository, createInaturalistProjectionRepository } =
      await import("../dist/index.js");
    const sql = postgres(databaseUrl);
    const retrievedAt = "2026-08-23T00:00:00.000Z";
    const prefix = "integration-inaturalist:";
    const records = [
      {
        source: "inaturalist",
        sourceRecordId: `${prefix}taxon:900001`,
        sourceUrl: "https://www.inaturalist.org/taxa/900001",
        retrievedAt,
        license: "per-record-review",
        attribution: "iNaturalist integration fixture",
        assertionType: "taxonomic_fact",
        rawPayload: { taxon: { id: 900001, name: "Testus floribundus" } },
        importerVersion: "integration-test",
        status: "pending",
      },
      {
        source: "inaturalist",
        sourceRecordId: `${prefix}observation:900002`,
        sourceUrl: "https://www.inaturalist.org/observations/900002",
        retrievedAt,
        license: "https://creativecommons.org/licenses/by-nc/4.0/",
        attribution: "iNaturalist observation 900002; observador: fixture",
        assertionType: "contemporary_observation",
        rawPayload: {
          id: 900002,
          observed_on: "2026-02-02",
          quality_grade: "research",
          geoprivacy: "open",
          taxon_geoprivacy: "open",
          geojson: { type: "Point", coordinates: [-71.308512, -33.745195] },
          user: { login: "fixture" },
        },
        importerVersion: "integration-test",
        status: "pending",
      },
      {
        source: "inaturalist",
        sourceRecordId: `${prefix}photo:900003`,
        sourceUrl: "https://www.inaturalist.org/photos/900003",
        retrievedAt,
        license: "https://creativecommons.org/licenses/by/4.0/",
        attribution: "iNaturalist media 900003; fixture",
        assertionType: "contemporary_observation",
        rawPayload: {
          observationId: 900002,
          mediaKind: "photo",
          media: {
            id: 900003,
            original_url: "https://static.inaturalist.test/900003.jpg",
            type: "StillImage",
          },
        },
        importerVersion: "integration-test",
        status: "pending",
      },
      {
        source: "inaturalist",
        sourceRecordId: `${prefix}sound:900004`,
        sourceUrl: "https://www.inaturalist.org/sounds/900004",
        retrievedAt,
        license: "all-rights-reserved",
        attribution: "iNaturalist media 900004; fixture",
        assertionType: "contemporary_observation",
        rawPayload: {
          observationId: 900002,
          mediaKind: "sound",
          media: {
            id: 900004,
            file_url: "https://static.inaturalist.test/900004.mp3",
          },
        },
        importerVersion: "integration-test",
        status: "pending",
      },
    ];
    try {
      const persisted =
        await createImportRepository(sql).persistSourceRecords(records);
      const sourceRecordIds = Object.assign(
        {},
        ...persisted.map((item) => item.recordIds),
      );
      const result = await createInaturalistProjectionRepository(
        sql,
      ).persistSnapshot({
        taxon: {
          sourceRecordId: "900001",
          sourceUrl: "https://www.inaturalist.org/taxa/900001",
          scientificName: "Testus floribundus",
          rank: "species",
          externalIdentifier: {
            namespace: "inaturalist",
            identifier: "900001",
            canonicalUrl: "https://www.inaturalist.org/taxa/900001",
          },
        },
        taxonRecord: records[0],
        observationRecords: [records[1]],
        mediaRecords: records.slice(2),
        sourceRecordIds,
      });
      assert.equal(result.observations, 1);
      assert.equal(result.media, 2);
      assert.equal(result.restrictedMedia, 2);

      const [observation] = await sql`
        SELECT visibility, ST_AsText(geometry_public) AS geometry_public
        FROM observations
        WHERE public_id = 'observation-inaturalist-900002'
      `;
      assert.equal(observation.visibility, "restricted");
      assert.equal(observation.geometry_public, "POINT(-71.31 -33.75)");

      const media = await sql`
        SELECT media_type, visibility, license_uri
        FROM media
        WHERE uri LIKE 'https://static.inaturalist.test/%'
        ORDER BY uri ASC
      `;
      assert.equal(media.length, 2);
      assert.ok(media.every((item) => item.visibility === "restricted"));
      assert.equal(
        media.find((item) => item.media_type === "image").license_uri,
        "https://creativecommons.org/licenses/by/4.0/",
      );
    } finally {
      await sql.begin(async (transaction) => {
        await transaction`
          DELETE FROM record_provenance
          WHERE source_record_id IN (
            SELECT id FROM source_records
            WHERE source_record_id LIKE ${prefix + "%"}
          )
        `;
        await transaction`
          DELETE FROM media_attachments
          WHERE media_id IN (
            SELECT id FROM media
            WHERE uri LIKE 'https://static.inaturalist.test/%'
          )
        `;
        await transaction`
          DELETE FROM media
          WHERE uri LIKE 'https://static.inaturalist.test/%'
        `;
        await transaction`
          DELETE FROM observations
          WHERE public_id = 'observation-inaturalist-900002'
        `;
        await transaction`
          DELETE FROM external_identifiers
          WHERE namespace = 'inaturalist' AND identifier = '900001'
        `;
        await transaction`
          DELETE FROM biological_entities
          WHERE public_id = 'biological-entity-inaturalist-900001'
        `;
        await transaction`
          DELETE FROM taxa
          WHERE public_id = 'taxon-inaturalist-900001'
        `;
        await transaction`
          DELETE FROM source_records
          WHERE source_record_id LIKE ${prefix + "%"}
        `;
      });
      await sql.end();
    }
  },
);
