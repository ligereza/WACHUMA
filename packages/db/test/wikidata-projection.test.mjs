import assert from "node:assert/strict";
import postgres from "postgres";
import test from "node:test";

const run = process.env.RUN_DB_INTEGRATION === "1";
const databaseUrl = process.env.DATABASE_URL;

test(
  "Wikidata links structured identifiers to an existing local taxon without duplicating it",
  { skip: !run || !databaseUrl },
  async () => {
    const {
      createImportRepository,
      createWikidataProjectionRepository,
      createSourceReviewRepository,
      createTaxonomyRepository,
    } = await import("../dist/index.js");
    const sql = postgres(databaseUrl);
    const retrievedAt = "2026-08-23T00:00:00.000Z";
    const prefix = "integration-wikidata:";
    const taxonPublicId = "taxon-integration-wikidata-existing";
    const entityPublicId = "biological-entity-integration-wikidata-existing";
    const identifiers = [
      {
        property: "wikidata",
        namespace: "wikidata",
        identifier: "Q900002",
        canonicalUrl: "https://www.wikidata.org/entity/Q900002",
      },
      {
        property: "P846",
        namespace: "gbif",
        identifier: "9900001",
        canonicalUrl: "https://www.gbif.org/species/9900001",
      },
      {
        property: "P3151",
        namespace: "inaturalist",
        identifier: "9900002",
        canonicalUrl: "https://www.inaturalist.org/taxa/9900002",
      },
    ];
    const record = {
      source: "wikidata",
      sourceRecordId: `${prefix}item:Q900002`,
      sourceUrl: "https://www.wikidata.org/entity/Q900002",
      retrievedAt,
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      attribution: "Wikidata integration fixture; item Q900002",
      assertionType: "taxonomic_fact",
      rawPayload: {
        itemId: "Q900002",
        claims: [
          {
            property: "P225",
            claimId: "Q900002$P225-1",
            datatype: "string",
            value: "Testus wikidatensis",
          },
        ],
      },
      rawChecksum: "sha256:integration-wikidata",
      importerVersion: "integration-test",
      status: "pending",
    };
    try {
      const [taxon] = await sql`
        INSERT INTO taxa (
          public_id, scientific_name, rank, taxonomic_status, description
        ) VALUES (
          ${taxonPublicId}, 'Testus wikidatensis', 'species', 'accepted', 'fixture'
        )
        RETURNING id
      `;
      const [entity] = await sql`
        INSERT INTO biological_entities (
          public_id, entity_type, display_name, taxon_id, visibility
        ) VALUES (
          ${entityPublicId}, 'species', 'Testus wikidatensis', ${taxon.id}, 'public'
        )
        RETURNING id
      `;
      assert.ok(taxon?.id);
      assert.ok(entity?.id);

      const persisted = await createImportRepository(sql).persistSourceRecords([
        record,
      ]);
      const sourceRecordIds = Object.assign(
        {},
        ...persisted.map((item) => item.recordIds),
      );
      const input = {
        taxon: {
          sourceRecordId: record.sourceRecordId,
          sourceUrl: record.sourceUrl,
          scientificName: "Testus wikidatensis",
          rank: "species",
          taxonomicStatus: "unresolved",
          externalIdentifiers: identifiers,
        },
        itemRecord: record,
        sourceRecordIds,
      };
      const repository = createWikidataProjectionRepository(sql);
      const result = await repository.persistSnapshot(input);
      const secondResult = await repository.persistSnapshot(input);

      assert.equal(result.linkedExistingTaxon, true);
      assert.equal(result.taxonPublicId, taxonPublicId);
      assert.equal(result.biologicalEntityPublicId, entityPublicId);
      assert.equal(result.identifiers, 3);
      assert.equal(secondResult.identifiers, 3);

      const reviewRecords = await createSourceReviewRepository(
        sql,
      ).listSourceRecords({
        providerKey: "wikidata",
        status: "pending",
        limit: 100,
      });
      const reviewRecord = reviewRecords.find(
        (candidate) => candidate.sourceRecordId === record.sourceRecordId,
      );
      assert.ok(reviewRecord);
      const reviewIdentifiers = reviewRecord.targets
        .filter((target) => target.kind === "external_identifier")
        .map((target) => `${target.namespace}:${target.identifier}`)
        .sort();
      assert.deepEqual(reviewIdentifiers, [
        "gbif:9900001",
        "inaturalist:9900002",
        "wikidata:Q900002",
      ]);

      const [taxonCount] = await sql`
        SELECT COUNT(*)::int AS count
        FROM taxa
        WHERE scientific_name = 'Testus wikidatensis'
      `;
      assert.equal(taxonCount.count, 1);
      const externalRows = await sql`
        SELECT external_identifier.namespace, external_identifier.identifier,
               COUNT(provenance.id)::int AS provenance_count
        FROM external_identifiers AS external_identifier
        LEFT JOIN record_provenance AS provenance
          ON provenance.external_identifier_id = external_identifier.id
        WHERE external_identifier.identifier IN ('Q900002', '9900001', '9900002')
        GROUP BY external_identifier.namespace, external_identifier.identifier
        ORDER BY external_identifier.namespace
      `;
      assert.equal(externalRows.length, 3);
      assert.ok(externalRows.every((row) => row.provenance_count === 1));

      const publicSpecies =
        await createTaxonomyRepository(sql).getPublicSpecies(entityPublicId);
      assert.ok(publicSpecies);
      assert.equal(
        publicSpecies.externalIdentifiers.some(
          (item) =>
            item.namespace === "wikidata" && item.identifier === "Q900002",
        ),
        false,
      );
      assert.deepEqual(
        await createTaxonomyRepository(sql).listPublicSpecies({
          search: "Q900002",
          limit: 10,
        }),
        [],
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
          DELETE FROM external_identifiers
          WHERE identifier IN ('Q900002', '9900001', '9900002')
        `;
        await transaction`
          DELETE FROM source_records
          WHERE source_record_id LIKE ${prefix + "%"}
        `;
        await transaction`
          DELETE FROM biological_entities WHERE public_id = ${entityPublicId}
        `;
        await transaction`
          DELETE FROM taxa WHERE public_id = ${taxonPublicId}
        `;
      });
      await sql.end();
    }
  },
);
