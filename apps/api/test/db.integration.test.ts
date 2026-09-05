import postgres from "postgres";
import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";
import { createTaxonomyRepository } from "@wachuma/db";

const run = process.env.RUN_DB_INTEGRATION === "1";
const databaseUrl = process.env.DATABASE_URL;

test(
  "PostgreSQL/PostGIS seed exposes the public vertical and hides restricted data",
  { skip: !run || !databaseUrl },
  async () => {
    const observedSearchQueries: Array<{
      query: string;
      parameters: unknown[];
    }> = [];
    const sql = postgres(databaseUrl!, {
      debug: (_connection, query, parameters) => {
        if (query.includes("WITH search_params AS")) {
          observedSearchQueries.push({ query, parameters });
        }
      },
    });
    const app = buildApi({ sql, adminToken: "integration-token" });
    try {
      const health = await app.inject({
        method: "GET",
        url: "/api/v1/health",
      });
      assert.equal(health.statusCode, 200);

      const species = await app.inject({
        method: "GET",
        url: "/api/v1/species?search=pachanoi",
      });
      assert.equal(species.statusCode, 200);
      assert.equal(
        species.json()[0]?.publicId,
        "biological-entity-echinopsis-pachanoi",
      );

      for (const publicId of ["biological-entity-echinopsis-pachanoi"]) {
        const materialFixture = await app.inject({
          method: "GET",
          url: `/api/v1/material-fixtures/${publicId}`,
        });
        assert.equal(materialFixture.statusCode, 200);
        const fixtureBody = materialFixture.json() as {
          representationType: string;
          interpretation: { scientificReconstruction: boolean };
          bindings: Array<{
            layer: string;
            sourcePublicIds?: string[];
          }>;
        };
        assert.equal(
          fixtureBody.representationType,
          "procedural-interpretation",
        );
        assert.equal(
          fixtureBody.interpretation.scientificReconstruction,
          false,
        );
        assert.equal(
          fixtureBody.bindings.some((binding) => binding.layer === "chemistry"),
          false,
        );
        assert.ok(
          fixtureBody.bindings.every(
            (binding) => (binding.sourcePublicIds?.length ?? 0) > 0,
          ),
        );
      }

      const search = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=pachanoi&limit=20",
      });
      assert.equal(search.statusCode, 200);
      assert.ok(
        search
          .json()
          .some(
            (result: { kind: string; publicId: string }) =>
              result.kind === "species" &&
              result.publicId === "biological-entity-echinopsis-pachanoi",
          ),
      );
      assert.ok(
        search
          .json()
          .some(
            (result: { kind: string; publicId: string }) =>
              result.kind === "guide" &&
              result.publicId === "guide-echinopsis-pachanoi-general-cacti-v1",
          ),
      );
      assert.ok(
        search
          .json()
          .every((result: { sourcePublicIds: unknown[] }) =>
            Array.isArray(result.sourcePublicIds),
          ),
      );

      const observedSearch = observedSearchQueries.at(-1);
      assert.ok(
        observedSearch,
        "the integration test must capture the real search query",
      );
      assert.match(observedSearch.query, /ILIKE/);
      const [searchPlanRow] = await sql.unsafe<
        Array<{ "QUERY PLAN": Array<Record<string, unknown>> }>
      >(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${observedSearch.query}`,
        observedSearch.parameters,
      );
      const searchPlan = searchPlanRow?.["QUERY PLAN"]?.[0];
      assert.ok(searchPlan);
      assert.ok(Number(searchPlan["Execution Time"]) >= 0);
      assert.ok(searchPlan["Plan"]);

      const restrictedSearch = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=wachuma&limit=20",
      });
      assert.equal(restrictedSearch.statusCode, 200);
      assert.equal(
        restrictedSearch
          .json()
          .some(
            (result: { publicId: string }) =>
              result.publicId === "cultural-relation-wachuma-demo",
          ),
        false,
      );

      const acceptedSourceRecords = await app.inject({
        method: "GET",
        url: "/api/v1/admin/source-records?provider=gbif&status=accepted&limit=100",
        headers: { authorization: "Bearer integration-token" },
      });
      assert.equal(acceptedSourceRecords.statusCode, 200);
      assert.ok(
        acceptedSourceRecords
          .json()
          .every((record: { targets: unknown }) =>
            Array.isArray(record.targets),
          ),
      );
      const promotedSourceRecord = acceptedSourceRecords
        .json()
        .find(
          (record: { id: string }) =>
            record.id === "00000000-0000-4000-8000-000000000142",
        );
      assert.ok(promotedSourceRecord);
      assert.ok(
        promotedSourceRecord.targets.some(
          (target: { kind: string; publicId: string }) =>
            target.kind === "taxon" && Boolean(target.publicId),
        ),
      );
      assert.equal(typeof promotedSourceRecord.rawPayload, "object");
      assert.ok(promotedSourceRecord.rawPayload);
      assert.equal(promotedSourceRecord.providerLicense, "CC BY 4.0");
      assert.equal(promotedSourceRecord.publishedDiff.state, "published");
      assert.ok(Array.isArray(promotedSourceRecord.publishedDiff.targets));

      const pendingPageRecords = await app.inject({
        method: "GET",
        url: "/api/v1/admin/source-records?provider=web-page&status=pending&limit=1",
        headers: { authorization: "Bearer integration-token" },
      });
      assert.equal(pendingPageRecords.statusCode, 200);
      const pendingPageRecord = pendingPageRecords.json()[0] as
        | {
            providerLicense?: string;
            publishedDiff: { state: string };
            reviewProposal?: {
              sourceRecordId: string;
              license: { status: string };
              supportedStatements: string[];
              notSupported: string[];
            };
          }
        | undefined;
      assert.equal(pendingPageRecord?.providerLicense, "per-record-review");
      assert.equal(pendingPageRecord?.publishedDiff.state, "unlinked");
      assert.ok(pendingPageRecord?.reviewProposal);
      assert.equal(
        pendingPageRecord?.reviewProposal?.sourceRecordId,
        pendingPageRecords.json()[0].sourceRecordId,
      );
      assert.ok(pendingPageRecord?.reviewProposal?.supportedStatements.length);
      assert.ok(pendingPageRecord?.reviewProposal?.notSupported.length);

      const fungalTraitsSourceRecordKey = "fungaltraits:integration-guard";
      const fungalTraitsSourceRecordId = "00000000-0000-4000-9000-000000000778";
      const fungalTraitsDataSourceId = "00000000-0000-4000-9000-000000000777";
      const [existingFungalTraitsDataSource] = await sql<{ id: string }[]>`
        SELECT id
        FROM data_sources
        WHERE provider_key = 'fungaltraits'
        LIMIT 1
      `;
      const createdFungalTraitsDataSource = !existingFungalTraitsDataSource;
      const resolvedFungalTraitsDataSourceId =
        existingFungalTraitsDataSource?.id ?? fungalTraitsDataSourceId;
      if (createdFungalTraitsDataSource) {
        await sql`
          INSERT INTO data_sources (
            id, provider_key, name, source_type, base_url, terms_url,
            default_license_uri
          ) VALUES (
            ${fungalTraitsDataSourceId},
            'fungaltraits',
            'FungalTraits integration guard',
            'external_dataset',
            'https://zenodo.org/records/1216257',
            'https://zenodo.org/records/1216257',
            'Other (Open)'
          )
        `;
      }
      try {
        await sql`
          DELETE FROM source_records
          WHERE source_record_id = ${fungalTraitsSourceRecordKey}
        `;
        await sql`
          INSERT INTO source_records (
            id, data_source_id, source_record_id, source_url, retrieved_at,
            license_uri, attribution, assertion_type, raw_payload, raw_checksum,
            importer_version, status
          ) VALUES (
            ${fungalTraitsSourceRecordId},
            ${resolvedFungalTraitsDataSourceId},
            ${fungalTraitsSourceRecordKey},
            'https://zenodo.org/records/1216257',
            '2026-08-24T00:00:00Z',
            'Other (Open)',
            'FungalTraits integration fixture',
            'academic_publication',
            ${sql.json({ legacyFixture: true, licenseReview: "unresolved" })},
            'sha256:fungaltraits-integration-guard',
            'integration-guard-0.1.0',
            'pending'
          )
        `;

        const fungalTraitsPending = await app.inject({
          method: "GET",
          url: `/api/v1/admin/source-records?provider=fungaltraits&sourceRecordId=${encodeURIComponent(fungalTraitsSourceRecordKey)}&status=pending&limit=1`,
          headers: { authorization: "Bearer integration-token" },
        });
        assert.equal(fungalTraitsPending.statusCode, 200);
        const fungalTraitsRecord = fungalTraitsPending.json()[0] as
          { id?: string; rawPayload?: Record<string, unknown> } | undefined;
        assert.equal(fungalTraitsRecord?.id, fungalTraitsSourceRecordId);
        const fungalTraitsReview = await app.inject({
          method: "POST",
          url: `/api/v1/admin/source-records/${fungalTraitsSourceRecordId}/review`,
          headers: { authorization: "Bearer integration-token" },
          payload: {
            reviewer: "integration-editor",
            decision: "accepted",
            note: "No aceptar traits hasta resolver derechos del dataset agregado.",
            licenseConfirmed: true,
            attributionConfirmed: true,
            privacyConfirmed: true,
          },
        });
        assert.equal(fungalTraitsReview.statusCode, 409);
        assert.equal(fungalTraitsReview.json().error, "license_required");
        assert.ok(
          fungalTraitsReview
            .json()
            .details.blockers.includes("publication_decision_missing"),
        );
        const fungalTraitsStatus = await sql<{ status: string }[]>`
          SELECT status
          FROM source_records
          WHERE id = ${fungalTraitsSourceRecordId}
        `;
        assert.equal(fungalTraitsStatus[0]?.status, "pending");
      } finally {
        await sql`
          DELETE FROM source_records
          WHERE id = ${fungalTraitsSourceRecordId}
        `;
        if (createdFungalTraitsDataSource) {
          await sql`
            DELETE FROM data_sources
            WHERE id = ${fungalTraitsDataSourceId}
          `;
        }
      }

      const echinopsis = await app.inject({
        method: "GET",
        url: "/api/v1/species/biological-entity-echinopsis-pachanoi",
      });
      assert.equal(echinopsis.statusCode, 200);
      const echinopsisBody = echinopsis.json() as {
        taxonomicStatus: string;
        externalIdentifiers: Array<{ namespace: string; identifier: string }>;
        sources: Array<{ publicId: string }>;
      };
      assert.equal(echinopsisBody.taxonomicStatus, "unresolved");
      assert.ok(
        echinopsisBody.externalIdentifiers.some(
          (identifier) =>
            identifier.namespace === "ipni" &&
            identifier.identifier === "77125731-1",
        ),
      );
      assert.ok(
        echinopsisBody.sources.some(
          (source) =>
            source.publicId === "source-albesiano-kiesling-macrogonus-2012",
        ),
      );
      const taxonomicClaims = await app.inject({
        method: "GET",
        url: "/api/v1/claims?subjectPublicId=biological-entity-echinopsis-pachanoi&limit=100",
      });
      assert.equal(taxonomicClaims.statusCode, 200);
      const taxonomicPositions = taxonomicClaims
        .json()
        .filter(
          (claim: { predicate: string }) =>
            claim.predicate === "taxonomicStatus",
        );
      assert.deepEqual(
        taxonomicPositions
          .map((claim: { publicId: string }) => claim.publicId)
          .sort(),
        [
          "claim-albesiano-kiesling-macrogonus-pachanoi-2012",
          "claim-powo-echinopsis-pachanoi-accepted",
        ],
      );
      assert.ok(
        taxonomicPositions.some((claim: { objectText: string }) =>
          claim.objectText.includes("Trichocereus macrogonus var. pachanoi"),
        ),
      );
      const pathogenicityPositions = taxonomicClaims
        .json()
        .filter(
          (claim: { predicate: string }) => claim.predicate === "pathogenicity",
        );
      assert.equal(pathogenicityPositions.length, 4);
      assert.deepEqual(
        pathogenicityPositions
          .map((claim: { objectType?: string; objectId?: string }) => [
            claim.objectType,
            claim.objectId,
          ])
          .every(
            ([objectType, objectId]: [
              string | undefined,
              string | undefined,
            ]) => objectType === "biological_entity" && Boolean(objectId),
          ),
        true,
      );
      const relatedTaxonPositions = taxonomicClaims
        .json()
        .filter(
          (claim: { predicate: string }) => claim.predicate === "relatedTaxon",
        );
      assert.deepEqual(
        relatedTaxonPositions
          .map((claim: { publicId: string }) => claim.publicId)
          .sort(),
        [
          "claim-pachanoi-related-echinopsis-lageniformis",
          "claim-pachanoi-related-echinopsis-peruviana",
        ],
      );
      assert.ok(
        relatedTaxonPositions.every(
          (claim: { objectType?: string; objectId?: string }) =>
            claim.objectType === "biological_entity" && Boolean(claim.objectId),
        ),
      );
      assert.ok(echinopsis.json().ecology.length >= 2);
      assert.ok(
        echinopsis
          .json()
          .cultivation.some((item: string) => item.includes("RHS")),
      );
      assert.ok(
        echinopsis
          .json()
          .history.some((item: string) =>
            item.includes("Trichocereus pachanoi"),
          ),
      );
      assert.equal(
        echinopsis
          .json()
          .sources.find(
            (source: { publicId: string }) =>
              source.publicId === "source-powo-echinopsis-pachanoi",
          )?.sourceType,
        "external_dataset",
      );

      const catalog = await app.inject({
        method: "GET",
        url: "/api/v1/species?limit=100",
      });
      assert.equal(catalog.statusCode, 200);
      assert.deepEqual(
        catalog.json().map((item: { publicId: string }) => item.publicId),
        ["biological-entity-echinopsis-pachanoi"],
      );

      const archivedPleurotus = await app.inject({
        method: "GET",
        url: "/api/v1/species/biological-entity-pleurotus-ostreatus",
      });
      assert.equal(archivedPleurotus.statusCode, 404);

      const archivedOpuntia = await app.inject({
        method: "GET",
        url: "/api/v1/species/biological-entity-opuntia-ficus-indica",
      });
      assert.equal(archivedOpuntia.statusCode, 404);

      const echinopsisTraits = await app.inject({
        method: "GET",
        url: "/api/v1/traits?subjectPublicId=biological-entity-echinopsis-pachanoi",
      });
      assert.equal(echinopsisTraits.statusCode, 200);
      assert.equal(echinopsisTraits.json()[0]?.traitIdentifier, "height_cm");
      assert.equal(echinopsisTraits.json()[0]?.valueNumeric, 42);

      await sql.begin(async (transaction) => {
        const [observation] = await transaction<{ id: string }[]>`
          SELECT id
          FROM observations
          WHERE public_id = 'observation-demo-public-01'
          LIMIT 1
        `;
        assert.ok(observation);
        const [media] = await transaction<{ id: string }[]>`
          INSERT INTO media (
            media_type, uri, title, license_uri, attribution, visibility
          ) VALUES (
            'image',
            'https://example.invalid/wachuma-integration-observation-media.jpg',
            'Medio de integración sobre observación pública',
            'WACHUMA-PROJECT',
            'Fixture de integración WACHUMA',
            'public'
          )
          RETURNING id
        `;
        assert.ok(media);
        await transaction`
          INSERT INTO media_attachments (media_id, observation_id, sort_order)
          VALUES (${media.id}, ${observation.id}, 97)
        `;

        const speciesWithObservationMedia = await createTaxonomyRepository(
          transaction,
        ).getPublicSpecies("biological-entity-echinopsis-pachanoi");
        assert.ok(
          speciesWithObservationMedia?.media.some((item) =>
            item.uri.includes("wachuma-integration-observation-media"),
          ),
        );

        await transaction`
          DELETE FROM media
          WHERE id = ${media.id}
        `;
      });

      const promotion = await app.inject({
        method: "POST",
        url: "/api/v1/admin/source-records/00000000-0000-4000-8000-000000000142/promote-taxon",
        headers: { authorization: "Bearer integration-token" },
        payload: {
          reviewer: "integration-editor",
          note: "Fixture editorial: taxonomía, licencia, atribución y privacidad confirmadas.",
          taxonomyConfirmed: true,
          licenseConfirmed: true,
          attributionConfirmed: true,
          privacyConfirmed: true,
        },
      });
      assert.equal(promotion.statusCode, 200);
      assert.equal(promotion.json().visibility, "public");
      assert.equal(
        promotion.json().biologicalEntityPublicId,
        "biological-entity-echinopsis-pachanoi",
      );
      const [promotionAudit] = await sql`
        SELECT review_kind, taxonomy_confirmed
        FROM source_record_reviews
        WHERE source_record_id = '00000000-0000-4000-8000-000000000142'
        ORDER BY reviewed_at DESC
        LIMIT 1
      `;
      assert.equal(promotionAudit?.review_kind, "taxonomic_promotion");
      assert.equal(promotionAudit?.taxonomy_confirmed, true);

      const publicSpecimen = await app.inject({
        method: "GET",
        url: "/api/v1/specimens/specimen-public-demo-01",
      });
      assert.equal(publicSpecimen.statusCode, 200);
      assert.equal("currentLocation" in publicSpecimen.json(), false);

      const privateSpecimen = await app.inject({
        method: "GET",
        url: "/api/v1/specimens/specimen-demo-01",
      });
      assert.equal(privateSpecimen.statusCode, 404);

      const map = await app.inject({
        method: "GET",
        url: "/api/v1/map/places",
      });
      assert.equal(map.statusCode, 200);
      assert.equal(map.json()[0]?.source, "source-wachuma-demo-editorial");

      const observations = await app.inject({
        method: "GET",
        url: "/api/v1/observations?subjectPublicId=biological-entity-echinopsis-pachanoi",
      });
      assert.equal(observations.statusCode, 200);
      assert.equal(
        observations.json()[0]?.publicId,
        "observation-demo-public-01",
      );
      assert.equal("geometryExact" in observations.json()[0], false);

      const guides = await app.inject({ method: "GET", url: "/api/v1/guides" });
      assert.equal(guides.statusCode, 200);
      const echinopsisGuide = guides
        .json()
        .find(
          (guide: { subjectPublicId?: string }) =>
            guide.subjectPublicId === "biological-entity-echinopsis-pachanoi",
        );
      assert.equal(echinopsisGuide?.version, 1);
      assert.equal(
        echinopsisGuide?.publicId,
        "guide-echinopsis-pachanoi-general-cacti-v1",
      );
      assert.equal(
        echinopsisGuide?.claims[0]?.sourcePublicId,
        "source-rhs-cacti-succulents-guide",
      );
      assert.equal(echinopsisGuide?.sections.length, 15);
      assert.equal(
        echinopsisGuide?.sections.find(
          (section: { sectionKey: string }) => section.sectionKey === "light",
        )?.status,
        "documented",
      );
      assert.equal(
        echinopsisGuide?.sections.filter(
          (section: { status: string }) => section.status === "not_documented",
        ).length,
        0,
      );
      assert.equal(
        guides
          .json()
          .some(
            (guide: { subjectPublicId?: string }) =>
              guide.subjectPublicId ===
                "biological-entity-opuntia-ficus-indica" ||
              guide.subjectPublicId === "biological-entity-pleurotus-ostreatus",
          ),
        false,
      );

      const lineage = await app.inject({
        method: "GET",
        url: "/api/v1/lineage/specimen-public-demo-01",
      });
      assert.equal(lineage.statusCode, 200);
      assert.equal(
        lineage.json().relationships[0]?.relationshipType,
        "cutting_of",
      );

      const culture = await app.inject({
        method: "GET",
        url: "/api/v1/culture/relations?subjectPublicId=biological-entity-echinopsis-pachanoi",
      });
      assert.deepEqual(culture.json(), []);

      const auth = { authorization: "Bearer integration-token" };
      const locationPayload = {
        publicId: "integration-location-proof",
        name: "Ubicación de prueba de integración",
        locationType: "shelf",
        visibility: "restricted",
        geometryPublic: {
          type: "Point",
          coordinates: [-70.65, -33.45],
        },
        geometryExact: {
          type: "Point",
          coordinates: [-70.650123, -33.450456],
        },
      };
      const existingLocation = await app.inject({
        method: "GET",
        url: "/api/v1/admin/locations/integration-location-proof",
        headers: auth,
      });
      const location =
        existingLocation.statusCode === 404
          ? await app.inject({
              method: "POST",
              url: "/api/v1/admin/locations",
              headers: auth,
              payload: locationPayload,
            })
          : await app.inject({
              method: "PATCH",
              url: "/api/v1/admin/locations/integration-location-proof",
              headers: auth,
              payload: locationPayload,
            });
      assert.ok([200, 201].includes(location.statusCode));

      const specimenPayload = {
        publicId: "integration-specimen-proof",
        specimenType: "plant-live",
        biologicalEntityPublicId: "biological-entity-echinopsis-pachanoi",
        status: "alive",
        visibility: "restricted",
        notes: "Fixture de integración; no representa un ejemplar real.",
      };
      const existingSpecimen = await app.inject({
        method: "GET",
        url: "/api/v1/admin/specimens/integration-specimen-proof",
        headers: auth,
      });
      const specimen =
        existingSpecimen.statusCode === 404
          ? await app.inject({
              method: "POST",
              url: "/api/v1/admin/specimens",
              headers: auth,
              payload: specimenPayload,
            })
          : await app.inject({
              method: "PATCH",
              url: "/api/v1/admin/specimens/integration-specimen-proof",
              headers: auth,
              payload: {
                specimenType: specimenPayload.specimenType,
                biologicalEntityPublicId:
                  specimenPayload.biologicalEntityPublicId,
                status: specimenPayload.status,
                visibility: specimenPayload.visibility,
                notes: specimenPayload.notes,
              },
            });
      assert.ok([200, 201].includes(specimen.statusCode));

      const assignment = await app.inject({
        method: "POST",
        url: "/api/v1/admin/specimens/integration-specimen-proof/location",
        headers: auth,
        payload: { locationPublicId: "integration-location-proof" },
      });
      assert.equal(assignment.statusCode, 200);
      assert.equal(
        assignment.json().currentLocationPublicId,
        "integration-location-proof",
      );

      const cleared = await app.inject({
        method: "DELETE",
        url: "/api/v1/admin/specimens/integration-specimen-proof/location",
        headers: auth,
      });
      assert.equal(cleared.statusCode, 200);
      assert.equal(cleared.json().currentLocationPublicId, undefined);

      const gardenIntakePayload = {
        publicId: "integration-garden-intake-proof",
        specimenType: "plant-live",
        biologicalEntityPublicId: "biological-entity-echinopsis-pachanoi",
        status: "alive",
        visibility: "restricted",
        acquiredAt: "2026-08-23T00:00:00.000Z",
        notes:
          "Fixture de integración; simula una entrada de jardín con procedencia.",
        provenance: {
          sourceRecordId: "garden:integration-garden-intake-proof:v1",
          sourceUrl: "https://github.com/ligereza/WACHUMA",
          retrievedAt: "2026-08-23T00:00:00.000Z",
          license: "WACHUMA-GARDEN-PRIVATE",
          attribution: "WACHUMA garden ledger; custodia no pública.",
          rawPayload: {
            synthetic: true,
            fixture: "integration-test",
            acquisitionContext: "private garden intake",
          },
          importerVersion: "garden-intake-0.1.0",
          assertionType: "contemporary_observation",
          sourcePublicId: "source-wachuma-garden-ledger",
        },
      };
      const firstIntake = await app.inject({
        method: "POST",
        url: "/api/v1/admin/garden/intake/specimens",
        headers: auth,
        payload: gardenIntakePayload,
      });
      assert.ok([200, 201].includes(firstIntake.statusCode));
      assert.equal(firstIntake.json().specimen.visibility, "restricted");
      assert.equal(
        firstIntake.json().sourceRecordKey,
        gardenIntakePayload.provenance.sourceRecordId,
      );
      assert.equal(firstIntake.json().sourceRecordStatus, "pending");

      const repeatedIntake = await app.inject({
        method: "POST",
        url: "/api/v1/admin/garden/intake/specimens",
        headers: auth,
        payload: gardenIntakePayload,
      });
      assert.equal(repeatedIntake.statusCode, 200);
      assert.equal(repeatedIntake.json().created, false);
      assert.equal(
        repeatedIntake.json().sourceRecordId,
        firstIntake.json().sourceRecordId,
      );
      const [gardenProvenance] = await sql<
        Array<{ provenance_count: string; specimen_count: string }>
      >`
        SELECT
          COUNT(*)::text AS provenance_count,
          COUNT(DISTINCT specimen_id)::text AS specimen_count
        FROM record_provenance
        WHERE source_record_id = ${firstIntake.json().sourceRecordId}
      `;
      assert.equal(gardenProvenance?.provenance_count, "1");
      assert.equal(gardenProvenance?.specimen_count, "1");

      const restrictedIntakeSpecimen = await app.inject({
        method: "GET",
        url: "/api/v1/specimens/integration-garden-intake-proof",
      });
      assert.equal(restrictedIntakeSpecimen.statusCode, 404);

      const publishedGardenSpecimenPublicId =
        "integration-garden-published-proof";
      const publishedGardenSourceRecordKey =
        "garden:integration-garden-published-proof:v1";
      await sql.begin(async (transaction) => {
        await transaction`
          DELETE FROM record_provenance
          WHERE source_record_id IN (
            SELECT source_record.id
            FROM source_records AS source_record
            JOIN data_sources AS data_source
              ON data_source.id = source_record.data_source_id
            WHERE data_source.provider_key = 'wachuma-garden'
              AND source_record.source_record_id = ${publishedGardenSourceRecordKey}
          )
        `;
        await transaction`
          DELETE FROM specimen_locations
          WHERE specimen_id IN (
            SELECT id FROM specimens
            WHERE public_id = ${publishedGardenSpecimenPublicId}
          )
        `;
        await transaction`
          DELETE FROM specimens
          WHERE public_id = ${publishedGardenSpecimenPublicId}
        `;
        await transaction`
          DELETE FROM source_records
          WHERE source_record_id = ${publishedGardenSourceRecordKey}
            AND data_source_id = (
              SELECT id FROM data_sources
              WHERE provider_key = 'wachuma-garden'
            )
        `;
      });

      const publishableGardenIntake = await app.inject({
        method: "POST",
        url: "/api/v1/admin/garden/intake/specimens",
        headers: auth,
        payload: {
          ...gardenIntakePayload,
          publicId: publishedGardenSpecimenPublicId,
          notes: "Fixture temporal; prueba de publicación mediante revisión.",
          provenance: {
            ...gardenIntakePayload.provenance,
            sourceRecordId: publishedGardenSourceRecordKey,
            retrievedAt: "2026-08-23T00:01:00.000Z",
            license: "CC BY 4.0",
            attribution: "Fixture temporal WACHUMA; no es un ejemplar real.",
          },
        },
      });
      assert.ok([200, 201].includes(publishableGardenIntake.statusCode));
      assert.equal(
        publishableGardenIntake.json().specimen.visibility,
        "restricted",
      );

      const publishedReview = await app.inject({
        method: "POST",
        url: `/api/v1/admin/source-records/${publishableGardenIntake.json().sourceRecordId}/review`,
        headers: auth,
        payload: {
          reviewer: "integration-test",
          decision: "accepted",
          note: "Fixture temporal; la prueba confirma el gate de publicación.",
          licenseConfirmed: true,
          attributionConfirmed: true,
          privacyConfirmed: true,
        },
      });
      assert.equal(publishedReview.statusCode, 200);
      assert.equal(publishedReview.json().status, "accepted");

      const publishedSpecimen = await app.inject({
        method: "GET",
        url: `/api/v1/specimens/${publishedGardenSpecimenPublicId}`,
      });
      assert.equal(publishedSpecimen.statusCode, 200);
      assert.equal(publishedSpecimen.json().visibility, "public");

      await sql.begin(async (transaction) => {
        await transaction`
          DELETE FROM record_provenance
          WHERE source_record_id IN (
            SELECT source_record.id
            FROM source_records AS source_record
            JOIN data_sources AS data_source
              ON data_source.id = source_record.data_source_id
            WHERE data_source.provider_key = 'wachuma-garden'
              AND source_record.source_record_id = ${publishedGardenSourceRecordKey}
          )
        `;
        await transaction`
          DELETE FROM specimens
          WHERE public_id = ${publishedGardenSpecimenPublicId}
        `;
        await transaction`
          DELETE FROM source_records
          WHERE source_record_id = ${publishedGardenSourceRecordKey}
            AND data_source_id = (
              SELECT id FROM data_sources
              WHERE provider_key = 'wachuma-garden'
            )
        `;
      });

      const adminRelation = await app.inject({
        method: "GET",
        url: "/api/v1/admin/culture/relations/cultural-relation-wachuma-demo",
        headers: auth,
      });
      assert.equal(adminRelation.statusCode, 200);
      assert.equal(adminRelation.json().accessLevel, "restricted");

      const sourcedCulturalRelation = await app.inject({
        method: "GET",
        url: "/api/v1/admin/culture/relations/cultural-relation-san-pedro-saraguro-2014",
        headers: auth,
      });
      assert.equal(sourcedCulturalRelation.statusCode, 200);
      assert.equal(sourcedCulturalRelation.json().valueText, "San Pedro");
      assert.equal(sourcedCulturalRelation.json().accessLevel, "restricted");
      assert.equal(sourcedCulturalRelation.json().reviewStatus, "under-review");
      assert.equal(
        sourcedCulturalRelation.json().sourcePublicId,
        "source-armijos-saraguro-yachakkuna-2014",
      );
      const [culturalProvenance] = await sql`
        SELECT source_record_id, cultural_relation_id, community_id
        FROM record_provenance
        WHERE cultural_relation_id = '00000000-0000-4000-8000-000000000187'
        LIMIT 1
      `;
      assert.ok(culturalProvenance);

      const takedown = await app.inject({
        method: "POST",
        url: "/api/v1/admin/culture/relations/cultural-relation-wachuma-demo/takedown",
        headers: auth,
        payload: {
          reason: "Fixture de prueba del flujo de retiro.",
          reviewer: "integration-cultural-editor",
        },
      });
      assert.equal(takedown.statusCode, 200);
      assert.equal(takedown.json().reviewStatus, "rejected");
      assert.equal(takedown.json().accessLevel, "restricted");
      assert.equal(takedown.json().reviewedBy, "integration-cultural-editor");
      assert.ok(takedown.json().reviewedAt);

      const taxonRelationLookup = await app.inject({
        method: "GET",
        url: "/api/v1/admin/culture/relations/cultural-relation-taxon-proof",
        headers: auth,
      });
      const taxonRelation =
        taxonRelationLookup.statusCode === 404
          ? await app.inject({
              method: "POST",
              url: "/api/v1/admin/culture/relations",
              headers: auth,
              payload: {
                publicId: "cultural-relation-taxon-proof",
                relationType: "historical_account",
                subjectPublicId: "taxon-echinopsis-pachanoi",
                description: "Fixture de integración para sujeto Taxon.",
                communityPublicId: "community-demo-pending-review",
                documentedByAgentPublicId: "agent-wachuma-editorial-demo",
                sourcePublicId: "source-wachuma-demo-editorial",
                evidenceLevel: "unverified",
                assertionType: "editorial_interpretation",
                authorPerspective: "Fixture editorial de integración.",
                sensitivity: "sensitive",
                accessLevel: "restricted",
                license: "WACHUMA-PROJECT",
                reviewStatus: "draft",
              },
            })
          : taxonRelationLookup;
      assert.ok([200, 201].includes(taxonRelation.statusCode));
      assert.equal(
        taxonRelation.json().subjectPublicId,
        "taxon-echinopsis-pachanoi",
      );

      const cultureRelationLookup = await app.inject({
        method: "GET",
        url: "/api/v1/admin/culture/relations/cultural-relation-culture-proof",
        headers: auth,
      });
      const cultureRelation =
        cultureRelationLookup.statusCode === 404
          ? await app.inject({
              method: "POST",
              url: "/api/v1/admin/culture/relations",
              headers: auth,
              payload: {
                publicId: "cultural-relation-culture-proof",
                relationType: "cultivation",
                subjectPublicId: "biological-entity-echinopsis-pachanoi",
                culturePublicId: "culture-demo-public-agar",
                historicalPeriodPublicId: "period-wachuma-demo",
                documentedByAgentPublicId: "agent-wachuma-editorial-demo",
                sourcePublicId: "source-wachuma-demo-editorial",
                description: "Fixture de integración para vínculo Culture.",
                evidenceLevel: "unverified",
                assertionType: "editorial_interpretation",
                authorPerspective: "Fixture editorial de integración.",
                sensitivity: "sensitive",
                accessLevel: "restricted",
                license: "WACHUMA-PROJECT",
                reviewStatus: "draft",
              },
            })
          : cultureRelationLookup;
      assert.ok([200, 201].includes(cultureRelation.statusCode));
      assert.equal(
        cultureRelation.json().culturePublicId,
        "culture-demo-public-agar",
      );
      assert.equal(
        cultureRelation.json().documentedByAgentPublicId,
        "agent-wachuma-editorial-demo",
      );
    } finally {
      await app.close();
      await sql.end();
    }
  },
);

test(
  "protected lineage intake keeps provenance review separate from public publication",
  { skip: !run || !databaseUrl },
  async () => {
    const sql = postgres(databaseUrl!);
    const app = buildApi({ sql, adminToken: "integration-token" });
    const auth = { authorization: "Bearer integration-token" };
    const sourceRecordKey = "lineage:integration-proof:v1";
    try {
      await sql.begin(async (transaction) => {
        await transaction`
          DELETE FROM record_provenance
          WHERE source_record_id IN (
            SELECT id FROM source_records
            WHERE source_record_id = ${sourceRecordKey}
          )
        `;
        await transaction`
          DELETE FROM lineage_relationships
          WHERE source_id = (
            SELECT id FROM sources WHERE public_id = 'source-wachuma-garden-ledger'
          )
            AND notes = 'Integration lineage provenance proof.'
        `;
        await transaction`
          DELETE FROM source_records
          WHERE source_record_id = ${sourceRecordKey}
        `;
      });

      const payload = {
        relationshipType: "seed_from",
        parent: {
          kind: "specimen",
          publicId: "specimen-public-demo-01",
        },
        child: {
          kind: "specimen",
          publicId: "specimen-public-child-01",
        },
        occurredAt: "2026-08-23T00:00:00.000Z",
        notes: "Integration lineage provenance proof.",
        provenance: {
          sourceRecordId: sourceRecordKey,
          sourceUrl: "https://github.com/ligereza/WACHUMA",
          retrievedAt: "2026-08-23T00:00:00.000Z",
          license: "CC BY 4.0",
          attribution: "Integration fixture; no real garden material.",
          rawPayload: { fixture: "lineage-intake" },
          importerVersion: "lineage-intake-0.1.0",
          assertionType: "contemporary_observation",
          sourcePublicId: "source-wachuma-garden-ledger",
        },
      } as const;

      const first = await app.inject({
        method: "POST",
        url: "/api/v1/admin/lineage/relationships",
        headers: auth,
        payload,
      });
      assert.equal(first.statusCode, 201);
      assert.equal(first.json().sourceRecordStatus, "pending");
      assert.equal(first.json().sourceRecordKey, sourceRecordKey);

      const repeated = await app.inject({
        method: "POST",
        url: "/api/v1/admin/lineage/relationships",
        headers: auth,
        payload,
      });
      assert.equal(repeated.statusCode, 200);
      assert.equal(repeated.json().created, false);
      assert.equal(repeated.json().id, first.json().id);

      const beforeReview = await app.inject({
        method: "GET",
        url: "/api/v1/lineage/specimen-public-demo-01",
      });
      assert.equal(beforeReview.statusCode, 200);
      assert.equal(
        beforeReview
          .json()
          .relationships.some(
            (relationship: { relationshipType: string }) =>
              relationship.relationshipType === "seed_from",
          ),
        false,
      );

      const review = await app.inject({
        method: "POST",
        url: `/api/v1/admin/source-records/${first.json().sourceRecordId}/review`,
        headers: auth,
        payload: {
          reviewer: "integration-lineage-editor",
          decision: "accepted",
          note: "Fixture temporal; prueba de publicación de linaje.",
          licenseConfirmed: true,
          attributionConfirmed: true,
          privacyConfirmed: true,
        },
      });
      assert.equal(review.statusCode, 200);
      assert.equal(review.json().status, "accepted");
      assert.ok(
        review
          .json()
          .targets.some(
            (target: { kind: string; id?: string }) =>
              target.kind === "lineage_relationship" && Boolean(target.id),
          ),
      );

      const afterReview = await app.inject({
        method: "GET",
        url: "/api/v1/lineage/specimen-public-demo-01",
      });
      assert.equal(afterReview.statusCode, 200);
      assert.ok(
        afterReview
          .json()
          .relationships.some(
            (relationship: {
              relationshipType: string;
              sourcePublicId?: string;
            }) =>
              relationship.relationshipType === "seed_from" &&
              relationship.sourcePublicId === "source-wachuma-garden-ledger",
          ),
      );
    } finally {
      await sql.begin(async (transaction) => {
        await transaction`
          DELETE FROM record_provenance
          WHERE source_record_id IN (
            SELECT id FROM source_records
            WHERE source_record_id = ${sourceRecordKey}
          )
        `;
        await transaction`
          DELETE FROM lineage_relationships
          WHERE notes = 'Integration lineage provenance proof.'
        `;
        await transaction`
          DELETE FROM source_records
          WHERE source_record_id = ${sourceRecordKey}
        `;
      });
      await app.close();
      await sql.end();
    }
  },
);
