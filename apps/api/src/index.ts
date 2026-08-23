import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import postgres, { type Sql } from "postgres";
import { parse as parseYaml } from "yaml";
import {
  createCultivationRepository,
  createCultivationEventRepository,
  createClaimRepository,
  createDerivationRepository,
  createTraitRepository,
  createCultureRepository,
  createCultureAdminRepository,
  createGardenRepository,
  createGardenAdminRepository,
  createLineageRepository,
  createMapsRepository,
  createObservationRepository,
  createSceneRepository,
  createSourceRepository,
  createTaxonomyRepository,
} from "@wachuma/db";
import { demoSceneDocument } from "@wachuma/scene3d";
import { demoPublicMapFeatures } from "@wachuma/maps";
import { demoSpeciesDocument } from "@wachuma/taxonomy";
import { demoPublicObservations, demoPublicSpecimen } from "@wachuma/garden";
import { demoCultivationEvents, demoGrowingGuide } from "@wachuma/cultivation";
import { demoPublicLineage } from "@wachuma/lineage";
import {
  AdminCultivationEventCreateSchema,
  AdminCulturalRelationCreateSchema,
  AdminCulturalTakedownSchema,
  AdminCulturalRelationUpdateSchema,
  AdminLocationCreateSchema,
  AdminLocationUpdateSchema,
  AdminSpecimenCreateSchema,
  AdminSpecimenLocationSchema,
  AdminSpecimenUpdateSchema,
  DomainError,
  ForbiddenError,
  ValidationError,
  parsePublicIdParams,
  parseSpeciesListQuery,
  toApiErrorBody,
  type Claim,
  type DerivationEvent,
  type TraitMeasurement,
} from "@wachuma/shared";
import { z } from "zod";

const publicDemoScene = {
  ...demoSceneDocument,
  scene: {
    ...demoSceneDocument.scene,
    visibility: "public" as const,
  },
  assets: demoSceneDocument.assets.filter(
    (asset) => (asset.visibility as string) === "public",
  ),
  objects: demoSceneDocument.objects.filter(
    (object) => (object.visibility as string) === "public",
  ),
  recipes: demoSceneDocument.recipes.filter(
    (recipe) => (recipe.visibility as string) === "public",
  ),
};

const demoPublicClaims: Array<Claim & { subjectPublicId: string }> = [
  {
    id: "claim-demo-taxonomy-01" as Claim["id"],
    publicId: "claim-demo-taxonomy-01" as Claim["publicId"],
    subjectType: "biological_entity",
    subjectId: "biological-entity-echinopsis-pachanoi" as Claim["subjectId"],
    subjectPublicId: "biological-entity-echinopsis-pachanoi",
    predicate: "hasScientificName",
    objectText: "Echinopsis pachanoi",
    assertionType: "taxonomic_fact",
    evidenceLevel: "documented",
    sourceId: "source-wachuma-demo-editorial" as Claim["sourceId"],
    sourcePublicId: "source-wachuma-demo-editorial" as NonNullable<
      Claim["sourcePublicId"]
    >,
    authorPerspective: "WACHUMA demo editorial record",
    recordedOn: "2026-08-21",
    visibility: "public",
    license: "WACHUMA-PROJECT",
    reviewStatus: "accepted",
  },
];

const demoPublicDerivations: DerivationEvent[] = [
  {
    id: "derivation-demo-cutting-01" as DerivationEvent["id"],
    publicId: "derivation-demo-cutting-01" as DerivationEvent["publicId"],
    eventType: "cutting",
    method: "synthetic demo derivation",
    occurredAt: "2026-01-20T12:00:00.000Z",
    sourceId: "source-wachuma-demo-editorial" as NonNullable<
      DerivationEvent["sourceId"]
    >,
    notes: "Fixture sintético; no representa material real.",
    visibility: "public",
    materials: [
      {
        id: "derivation-material-demo-input" as DerivationEvent["materials"][number]["id"],
        direction: "input",
        specimenId: "specimen-public-demo-01" as NonNullable<
          DerivationEvent["materials"][number]["specimenId"]
        >,
      },
      {
        id: "derivation-material-demo-output" as DerivationEvent["materials"][number]["id"],
        direction: "output",
        specimenId: "specimen-public-child-01" as NonNullable<
          DerivationEvent["materials"][number]["specimenId"]
        >,
      },
    ],
  },
];

const demoPublicTraits: TraitMeasurement[] = [
  {
    id: "trait-measurement-demo-01" as TraitMeasurement["id"],
    publicId: "trait-measurement-demo-01" as TraitMeasurement["publicId"],
    traitDefinitionId:
      "trait-definition-demo-height" as TraitMeasurement["traitDefinitionId"],
    traitNamespace: "WACHUMA",
    traitIdentifier: "height_cm",
    traitLabel: "Altura del ejemplar",
    specimenId: "specimen-public-demo-01" as NonNullable<
      TraitMeasurement["specimenId"]
    >,
    valueNumeric: 42,
    unit: "cm",
    measuredAt: "2026-01-15T12:00:00.000Z",
    method: "synthetic fixture measurement",
    uncertainty: { synthetic: true },
    sourceId: "source-wachuma-demo-editorial" as TraitMeasurement["sourceId"],
    visibility: "public",
  },
];

export interface ApiOptions {
  sql?: Sql | undefined;
  adminToken?: string | undefined;
}

export function buildApi(options: ApiOptions = {}) {
  const app = Fastify({ logger: true });
  const sceneRepository = options.sql
    ? createSceneRepository(options.sql)
    : undefined;
  const taxonomyRepository = options.sql
    ? createTaxonomyRepository(options.sql)
    : undefined;
  const gardenRepository = options.sql
    ? createGardenRepository(options.sql)
    : undefined;
  const gardenAdminRepository = options.sql
    ? createGardenAdminRepository(options.sql)
    : undefined;
  const lineageRepository = options.sql
    ? createLineageRepository(options.sql)
    : undefined;
  const cultivationRepository = options.sql
    ? createCultivationRepository(options.sql)
    : undefined;
  const cultivationEventRepository = options.sql
    ? createCultivationEventRepository(options.sql)
    : undefined;
  const claimRepository = options.sql
    ? createClaimRepository(options.sql)
    : undefined;
  const derivationRepository = options.sql
    ? createDerivationRepository(options.sql)
    : undefined;
  const traitRepository = options.sql
    ? createTraitRepository(options.sql)
    : undefined;
  const cultureRepository = options.sql
    ? createCultureRepository(options.sql)
    : undefined;
  const cultureAdminRepository = options.sql
    ? createCultureAdminRepository(options.sql)
    : undefined;
  const mapsRepository = options.sql
    ? createMapsRepository(options.sql)
    : undefined;
  const observationRepository = options.sql
    ? createObservationRepository(options.sql)
    : undefined;
  const sourceRepository = options.sql
    ? createSourceRepository(options.sql)
    : undefined;
  const configuredAdminToken =
    options.adminToken ?? process.env.WACHUMA_ADMIN_TOKEN;

  function parseBody<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new ValidationError("Invalid protected request", {
        issues: result.error.issues,
      });
    }
    return result.data;
  }

  function requireAdmin(request: {
    headers: { authorization?: string | undefined };
  }): void {
    const token = request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice("Bearer ".length)
      : undefined;
    if (!configuredAdminToken || !token) {
      throw new ForbiddenError(
        "Protected API requires administrator authentication",
      );
    }
    const expected = Buffer.from(configuredAdminToken);
    const received = Buffer.from(token);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new ForbiddenError("Invalid administrator credentials");
    }
  }

  function requireAdminRepository() {
    if (!gardenAdminRepository) {
      throw new DomainError(
        "internal_error",
        "Protected writes require a configured PostgreSQL database",
        503,
      );
    }
    return gardenAdminRepository;
  }

  function requireCultureAdminRepository() {
    if (!cultureAdminRepository) {
      throw new DomainError(
        "internal_error",
        "Protected cultural writes require a configured PostgreSQL database",
        503,
      );
    }
    return cultureAdminRepository;
  }

  const openApiPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../schemas/openapi.yaml",
  );
  const openApiDocument = parseYaml(readFileSync(openApiPath, "utf8"));
  void app.register(fastifySwagger, { openapi: openApiDocument });
  void app.register(fastifySwaggerUi, { routePrefix: "/docs" });

  app.setErrorHandler((error, request, reply) => {
    const result = toApiErrorBody(error, request.id);
    if (result.statusCode >= 500) {
      request.log.error(error);
    }
    return reply.code(result.statusCode).send(result.body);
  });

  app.get("/api/v1/health", async () => ({
    status: "ok",
    service: "wachuma-api",
  }));

  app.get<{ Querystring: { search?: string; limit?: string } }>(
    "/api/v1/species",
    async (request) => {
      const query = parseSpeciesListQuery(request.query);
      if (taxonomyRepository) {
        return taxonomyRepository.listPublicSpecies(query);
      }

      const normalizedSearch = query.search?.toLocaleLowerCase();
      const matches =
        !normalizedSearch ||
        [
          demoSpeciesDocument.scientificName,
          demoSpeciesDocument.displayName,
          ...(demoSpeciesDocument.taxonomicVariants ?? []).map(
            (variant) => variant.name,
          ),
          ...demoSpeciesDocument.vernacularNames.map((name) => name.term),
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      return matches ? [demoSpeciesDocument] : [];
    },
  );

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/species/:publicId",
    async (request, reply) => {
      const params = parsePublicIdParams(request.params);
      const species = taxonomyRepository
        ? await taxonomyRepository.getPublicSpecies(params.publicId)
        : params.publicId === demoSpeciesDocument.publicId
          ? demoSpeciesDocument
          : null;

      if (!species) {
        return reply.code(404).send({
          error: "not_found",
          message: "Species not found",
        });
      }

      return species;
    },
  );

  app.get<{ Querystring: { limit?: string } }>(
    "/api/v1/garden/specimens",
    async (request) => {
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return gardenRepository
        ? gardenRepository.listPublicSpecimens(query.limit)
        : [demoPublicSpecimen];
    },
  );

  app.get<{ Querystring: { limit?: string } }>(
    "/api/v1/garden/locations",
    async (request) => {
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return gardenRepository
        ? gardenRepository.listPublicLocations(query.limit)
        : [];
    },
  );

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/specimens/:publicId",
    async (request, reply) => {
      const params = parsePublicIdParams(request.params);
      const specimen = gardenRepository
        ? await gardenRepository.getPublicSpecimen(params.publicId)
        : params.publicId === demoPublicSpecimen.publicId
          ? demoPublicSpecimen
          : null;

      if (!specimen) {
        return reply.code(404).send({
          error: "not_found",
          message: "Specimen not found",
        });
      }

      return specimen;
    },
  );

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/lineage/:publicId",
    async (request, reply) => {
      const params = parsePublicIdParams(request.params);
      const lineage = lineageRepository
        ? await lineageRepository.getPublicLineage(params.publicId)
        : params.publicId === demoSpeciesDocument.publicId
          ? {
              subjectPublicId: demoSpeciesDocument.publicId,
              relationships: [],
              tree: {
                nodes: [
                  {
                    id: demoSpeciesDocument.publicId,
                    parents: [],
                    children: [],
                  },
                ],
                roots: [demoSpeciesDocument.publicId],
              },
            }
          : demoPublicLineage(params.publicId);

      if (!lineage) {
        return reply.code(404).send({
          error: "not_found",
          message: "Lineage subject not found or not public",
        });
      }

      return lineage;
    },
  );

  app.get<{ Querystring: { limit?: string } }>(
    "/api/v1/guides",
    async (request) => {
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return cultivationRepository
        ? cultivationRepository.listPublicGuides(query.limit)
        : [demoGrowingGuide];
    },
  );

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/guides/:publicId",
    async (request, reply) => {
      const params = parsePublicIdParams(request.params);
      const guide = cultivationRepository
        ? await cultivationRepository.getPublicGuide(params.publicId)
        : params.publicId === demoGrowingGuide.publicId
          ? demoGrowingGuide
          : null;

      if (!guide) {
        return reply.code(404).send({
          error: "not_found",
          message: "Growing guide not found or not published",
        });
      }

      return guide;
    },
  );

  app.get<{ Querystring: { specimenPublicId?: string } }>(
    "/api/v1/cultivation/events",
    async (request) => {
      const specimenPublicId = request.query.specimenPublicId;
      if (specimenPublicId) parsePublicIdParams({ publicId: specimenPublicId });
      if (cultivationEventRepository) {
        return cultivationEventRepository.listPublicEvents(specimenPublicId);
      }
      return specimenPublicId
        ? demoCultivationEvents.filter(
            (event) => event.specimenPublicId === specimenPublicId,
          )
        : demoCultivationEvents;
    },
  );

  app.get<{ Querystring: { subjectPublicId?: string } }>(
    "/api/v1/culture/relations",
    async (request) => {
      const subjectPublicId = request.query.subjectPublicId;
      if (subjectPublicId) parsePublicIdParams({ publicId: subjectPublicId });
      return cultureRepository
        ? cultureRepository.listPublicRelations(subjectPublicId)
        : [];
    },
  );

  app.get<{ Querystring: { subjectPublicId?: string; limit?: string } }>(
    "/api/v1/claims",
    async (request) => {
      const subjectPublicId = request.query.subjectPublicId;
      if (subjectPublicId) parsePublicIdParams({ publicId: subjectPublicId });
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return claimRepository
        ? claimRepository.listPublicClaims(subjectPublicId, query.limit)
        : demoPublicClaims
            .filter(
              (claim) =>
                !subjectPublicId || claim.subjectPublicId === subjectPublicId,
            )
            .slice(0, query.limit);
    },
  );

  app.get<{ Querystring: { subjectPublicId?: string; limit?: string } }>(
    "/api/v1/derivations",
    async (request) => {
      const subjectPublicId = request.query.subjectPublicId;
      if (subjectPublicId) parsePublicIdParams({ publicId: subjectPublicId });
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return derivationRepository
        ? derivationRepository.listPublicDerivations(
            subjectPublicId,
            query.limit,
          )
        : demoPublicDerivations
            .filter(
              (event) =>
                !subjectPublicId ||
                event.materials.some(
                  (material) =>
                    material.specimenId === subjectPublicId ||
                    material.biologicalEntityId === subjectPublicId ||
                    material.cultureId === subjectPublicId,
                ),
            )
            .slice(0, query.limit);
    },
  );

  app.get<{ Querystring: { subjectPublicId?: string; limit?: string } }>(
    "/api/v1/traits",
    async (request) => {
      const subjectPublicId = request.query.subjectPublicId;
      if (subjectPublicId) parsePublicIdParams({ publicId: subjectPublicId });
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return traitRepository
        ? traitRepository.listPublicTraitMeasurements(
            subjectPublicId,
            query.limit,
          )
        : demoPublicTraits
            .filter(
              (trait) =>
                !subjectPublicId ||
                trait.specimenId === subjectPublicId ||
                trait.biologicalEntityId === subjectPublicId ||
                trait.taxonId === subjectPublicId,
            )
            .slice(0, query.limit);
    },
  );

  app.get("/api/v1/map/places", async () =>
    mapsRepository ? mapsRepository.listPublicPlaces() : demoPublicMapFeatures,
  );

  app.get<{ Querystring: { subjectPublicId?: string; limit?: string } }>(
    "/api/v1/observations",
    async (request) => {
      const subjectPublicId = request.query.subjectPublicId;
      if (subjectPublicId) parsePublicIdParams({ publicId: subjectPublicId });
      const query = parseSpeciesListQuery({ limit: request.query.limit });
      return observationRepository
        ? observationRepository.listPublicObservations(
            subjectPublicId,
            query.limit,
          )
        : demoPublicObservations
            .filter(
              (observation) =>
                !subjectPublicId ||
                observation.subjectPublicId === subjectPublicId,
            )
            .slice(0, query.limit);
    },
  );

  app.get("/api/v1/sources", async () =>
    sourceRepository
      ? sourceRepository.listPublicSources()
      : demoSpeciesDocument.sources,
  );

  app.get("/api/v1/scenes", async () =>
    sceneRepository
      ? sceneRepository.listPublicScenes()
      : [
          {
            publicId: publicDemoScene.scene.publicId,
            name: publicDemoScene.scene.name,
            visibility: publicDemoScene.scene.visibility,
            version: publicDemoScene.scene.version,
            objectCount: publicDemoScene.objects.length,
          },
        ],
  );

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/scenes/:publicId",
    async (request, reply) => {
      const params = parsePublicIdParams(request.params);
      const scene = sceneRepository
        ? await sceneRepository.getPublicScene(params.publicId)
        : params.publicId === publicDemoScene.scene.publicId
          ? publicDemoScene
          : null;

      if (!scene) {
        return reply.code(404).send({
          error: "not_found",
          message: "Scene not found",
        });
      }

      return scene;
    },
  );

  app.get("/api/v1/admin/locations", async (request) => {
    requireAdmin(request);
    return requireAdminRepository().listLocations();
  });

  app.post("/api/v1/admin/locations", async (request, reply) => {
    requireAdmin(request);
    const input = parseBody(AdminLocationCreateSchema, request.body);
    const location = await requireAdminRepository().createLocation(input);
    return reply.code(201).send(location);
  });

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/admin/locations/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const location = await requireAdminRepository().getLocation(publicId);
      if (!location) {
        return reply.code(404).send({
          error: "not_found",
          message: "Location not found",
        });
      }
      return location;
    },
  );

  app.patch<{ Params: { publicId: string } }>(
    "/api/v1/admin/locations/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const input = parseBody(AdminLocationUpdateSchema, request.body);
      return reply.send(
        await requireAdminRepository().updateLocation(publicId, input),
      );
    },
  );

  app.delete<{ Params: { publicId: string } }>(
    "/api/v1/admin/locations/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      await requireAdminRepository().archiveLocation(publicId);
      return reply.code(204).send();
    },
  );

  app.get("/api/v1/admin/specimens", async (request) => {
    requireAdmin(request);
    return requireAdminRepository().listSpecimens();
  });

  app.post("/api/v1/admin/specimens", async (request, reply) => {
    requireAdmin(request);
    const input = parseBody(AdminSpecimenCreateSchema, request.body);
    const specimen = await requireAdminRepository().createSpecimen(input);
    return reply.code(201).send(specimen);
  });

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/admin/specimens/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const specimen = await requireAdminRepository().getSpecimen(publicId);
      if (!specimen) {
        return reply.code(404).send({
          error: "not_found",
          message: "Specimen not found",
        });
      }
      return specimen;
    },
  );

  app.patch<{ Params: { publicId: string } }>(
    "/api/v1/admin/specimens/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const input = parseBody(AdminSpecimenUpdateSchema, request.body);
      return reply.send(
        await requireAdminRepository().updateSpecimen(publicId, input),
      );
    },
  );

  app.delete<{ Params: { publicId: string } }>(
    "/api/v1/admin/specimens/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      await requireAdminRepository().archiveSpecimen(publicId);
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { publicId: string } }>(
    "/api/v1/admin/specimens/:publicId/location",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const input = parseBody(AdminSpecimenLocationSchema, request.body);
      return reply.send(
        await requireAdminRepository().assignSpecimenLocation(publicId, input),
      );
    },
  );

  app.delete<{ Params: { publicId: string } }>(
    "/api/v1/admin/specimens/:publicId/location",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      return reply.send(
        await requireAdminRepository().clearSpecimenLocation(publicId),
      );
    },
  );

  app.post("/api/v1/admin/cultivation/events", async (request, reply) => {
    requireAdmin(request);
    const input = parseBody(AdminCultivationEventCreateSchema, request.body);
    const event = await requireAdminRepository().createCultivationEvent(input);
    return reply.code(201).send(event);
  });

  app.get("/api/v1/admin/culture/relations", async (request) => {
    requireAdmin(request);
    return requireCultureAdminRepository().listRelations();
  });

  app.post("/api/v1/admin/culture/relations", async (request, reply) => {
    requireAdmin(request);
    const input = parseBody(AdminCulturalRelationCreateSchema, request.body);
    const relation =
      await requireCultureAdminRepository().createRelation(input);
    return reply.code(201).send(relation);
  });

  app.get<{ Params: { publicId: string } }>(
    "/api/v1/admin/culture/relations/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const relation =
        await requireCultureAdminRepository().getRelation(publicId);
      if (!relation) {
        return reply.code(404).send({
          error: "not_found",
          message: "Cultural relation not found",
        });
      }
      return relation;
    },
  );

  app.patch<{ Params: { publicId: string } }>(
    "/api/v1/admin/culture/relations/:publicId",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const input = parseBody(AdminCulturalRelationUpdateSchema, request.body);
      return reply.send(
        await requireCultureAdminRepository().updateRelation(publicId, input),
      );
    },
  );

  app.post<{ Params: { publicId: string } }>(
    "/api/v1/admin/culture/relations/:publicId/takedown",
    async (request, reply) => {
      requireAdmin(request);
      const { publicId } = parsePublicIdParams(request.params);
      const input = parseBody(AdminCulturalTakedownSchema, request.body);
      return reply.send(
        await requireCultureAdminRepository().takedownRelation(publicId, input),
      );
    },
  );

  return app;
}

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL)
  : undefined;
const app = buildApi({ sql });

if (sql) {
  app.addHook("onClose", async () => {
    await sql.end();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
}
