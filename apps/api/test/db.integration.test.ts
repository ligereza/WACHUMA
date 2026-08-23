import postgres from "postgres";
import assert from "node:assert/strict";
import test from "node:test";

import { buildApi } from "../src/index.ts";

const run = process.env.RUN_DB_INTEGRATION === "1";
const databaseUrl = process.env.DATABASE_URL;

test(
  "PostgreSQL/PostGIS seed exposes the public vertical and hides restricted data",
  { skip: !run || !databaseUrl },
  async () => {
    const sql = postgres(databaseUrl!);
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
      assert.equal(guides.json()[0]?.version, 1);

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

      const adminRelation = await app.inject({
        method: "GET",
        url: "/api/v1/admin/culture/relations/cultural-relation-wachuma-demo",
        headers: auth,
      });
      assert.equal(adminRelation.statusCode, 200);
      assert.equal(adminRelation.json().accessLevel, "restricted");

      const takedown = await app.inject({
        method: "POST",
        url: "/api/v1/admin/culture/relations/cultural-relation-wachuma-demo/takedown",
        headers: auth,
        payload: { reason: "Fixture de prueba del flujo de retiro." },
      });
      assert.equal(takedown.statusCode, 200);
      assert.equal(takedown.json().reviewStatus, "rejected");
      assert.equal(takedown.json().accessLevel, "restricted");

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
