import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import postgres from "postgres";
import { loadEditorialContent } from "./editorial-content.js";

type SceneFixture = {
  scene: {
    publicId: string;
    name: string;
    description?: string;
    coordinateSystem: string;
    units: string;
    version: number;
    defaultSeed?: number;
  };
  assets: Array<{
    publicId: string;
    format: string;
    origin: string;
    uri: string;
    contentHash: string;
    title?: string;
    license: string;
    attribution: string;
    metadata: Record<string, unknown>;
  }>;
  objects: Array<{
    publicId: string;
    objectType: string;
    label: string;
    specimenId?: string;
    sceneAssetId: string;
    transform: Record<string, unknown>;
    representationType: string;
    visibility: string;
    metadata: Record<string, unknown>;
  }>;
  recipes: Array<{
    publicId: string;
    algorithm: string;
    algorithmVersion: string;
    seed: number;
    parameters: Record<string, unknown>;
    constraints: Record<string, unknown>;
    targetBiologicalEntityId: string;
    generatedAssetId: string;
    status: string;
    visibility: string;
  }>;
};

type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

const rootDirectory = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const editorialContent = await loadEditorialContent(rootDirectory);

const ids = {
  taxon: "00000000-0000-4000-8000-000000000101",
  biologicalEntity: "00000000-0000-4000-8000-000000000102",
  specimenOne: "00000000-0000-4000-8000-000000000103",
  specimenTwo: "00000000-0000-4000-8000-000000000104",
  specimenPublic: "00000000-0000-4000-8000-000000000114",
  specimenPublicChildOne: "00000000-0000-4000-8000-000000000115",
  specimenPublicChildTwo: "00000000-0000-4000-8000-000000000116",
  media: "00000000-0000-4000-8000-000000000105",
  generatorVersion: "00000000-0000-4000-8000-000000000106",
  scene: "00000000-0000-4000-8000-000000000107",
  asset: "00000000-0000-4000-8000-000000000108",
  recipe: "00000000-0000-4000-8000-000000000109",
  objectOne: "00000000-0000-4000-8000-000000000110",
  objectTwo: "00000000-0000-4000-8000-000000000111",
  source: "00000000-0000-4000-8000-000000000112",
  assetProvenance: "00000000-0000-4000-8000-000000000113",
  dataSourcePowo: "00000000-0000-4000-8000-000000000139",
  dataSourceGbif: "00000000-0000-4000-8000-000000000140",
  sourceRecordPowo: "00000000-0000-4000-8000-000000000141",
  sourceRecordGbif: "00000000-0000-4000-8000-000000000142",
  sourcePowo: "00000000-0000-4000-8000-000000000143",
  sourceGbif: "00000000-0000-4000-8000-000000000144",
  claimPowo: "00000000-0000-4000-8000-000000000145",
  claimGbif: "00000000-0000-4000-8000-000000000146",
  sourceRhs: "00000000-0000-4000-8000-000000000147",
  guideRhs: "00000000-0000-4000-8000-000000000148",
  guideClaimRhsSubstrate: "00000000-0000-4000-8000-000000000149",
  guideClaimRhsWatering: "00000000-0000-4000-8000-000000000150",
  guideClaimRhsPropagation: "00000000-0000-4000-8000-000000000151",
  guideClaimRhsWinter: "00000000-0000-4000-8000-000000000152",
  claimPowoRange: "00000000-0000-4000-8000-000000000153",
  claimPowoBiome: "00000000-0000-4000-8000-000000000154",
  dataSourceSaraguro: "00000000-0000-4000-8000-000000000180",
  sourceRecordSaraguro: "00000000-0000-4000-8000-000000000181",
  sourceSaraguro: "00000000-0000-4000-8000-000000000182",
  communitySaraguro: "00000000-0000-4000-8000-000000000183",
  historicalPeriodSaraguro: "00000000-0000-4000-8000-000000000184",
  placeSaraguro: "00000000-0000-4000-8000-000000000185",
  agentSaraguroStudy: "00000000-0000-4000-8000-000000000186",
  dataSourceFrontiers: "00000000-0000-4000-8000-000000000188",
  dataSourceGarden: "00000000-0000-4000-8000-000000000198",
  sourceGarden: "00000000-0000-4000-8000-000000000199",
  sourceGbifOccurrence: "00000000-0000-4000-8000-000000000200",
  sourceRecordLineageDemo: "00000000-0000-4000-8000-000000000205",
  sourceMaterialFixture: "00000000-0000-4000-8000-000000000206",
  dataSourceWebPages: "00000000-0000-4000-8000-000000000207",
  sourceRecordUtn: "00000000-0000-4000-8000-000000000208",
  sourceRecordUnprg: "00000000-0000-4000-8000-000000000209",
  sourceRecordUntumbes: "00000000-0000-4000-8000-000000000210",
  sourceRecordScielo: "00000000-0000-4000-8000-000000000211",
  sourceUtn: "00000000-0000-4000-8000-000000000212",
  sourceUnprg: "00000000-0000-4000-8000-000000000213",
  sourceUntumbes: "00000000-0000-4000-8000-000000000214",
  sourceScielo: "00000000-0000-4000-8000-000000000215",
  claimUtn: "00000000-0000-4000-8000-000000000216",
  claimUnprg: "00000000-0000-4000-8000-000000000217",
  claimScielo: "00000000-0000-4000-8000-000000000218",
  claimUntumbes: "00000000-0000-4000-8000-000000000219",
  communityDemo: "00000000-0000-4000-8000-000000000123",
  locationPublic: "00000000-0000-4000-8000-000000000117",
  placePublic: "00000000-0000-4000-8000-000000000118",
  observationPublic: "00000000-0000-4000-8000-000000000119",
  eventPublic: "00000000-0000-4000-8000-000000000120",
  lineageCutting: "00000000-0000-4000-8000-000000000121",
  lineageClone: "00000000-0000-4000-8000-000000000122",
  guide: "00000000-0000-4000-8000-000000000124",
  guideClaimPropagation: "00000000-0000-4000-8000-000000000125",
  guideClaimSubstrate: "00000000-0000-4000-8000-000000000126",
  guideClaimObservation: "00000000-0000-4000-8000-000000000127",
  cultureDemo: "00000000-0000-4000-8000-000000000129",
  historicalPeriodDemo: "00000000-0000-4000-8000-000000000130",
  agentDemo: "00000000-0000-4000-8000-000000000131",
  claimDemo: "00000000-0000-4000-8000-000000000132",
  derivationEventDemo: "00000000-0000-4000-8000-000000000133",
  derivationMaterialInput: "00000000-0000-4000-8000-000000000134",
  derivationMaterialOutput: "00000000-0000-4000-8000-000000000135",
  protocolDemo: "00000000-0000-4000-8000-000000000136",
  traitDefinitionHeight: "00000000-0000-4000-8000-000000000137",
  traitMeasurementHeight: "00000000-0000-4000-8000-000000000138",
  claimEchinopsisHistory: "00000000-0000-4000-8000-000000000139",
} as const;

const guideIdByPublicId = new Map([
  ["guide-echinopsis-pachanoi-demo-v1", ids.guide],
  ["guide-echinopsis-pachanoi-general-cacti-v1", ids.guideRhs],
]);

const guideCoverageById = new Map(
  editorialContent.guides.map((guide) => {
    const guideId = guideIdByPublicId.get(guide.publicId);
    if (!guideId) {
      throw new Error(
        `Editorial guide ${guide.publicId} has no deterministic seed id`,
      );
    }
    return [guideId, guide.coverage.sections] as const;
  }),
);

const guideClaimIdsByPublicId = new Map<string, readonly string[]>([
  [
    "guide-echinopsis-pachanoi-demo-v1",
    [
      ids.guideClaimPropagation,
      ids.guideClaimSubstrate,
      ids.guideClaimObservation,
    ],
  ],
  [
    "guide-echinopsis-pachanoi-general-cacti-v1",
    [
      ids.guideClaimRhsSubstrate,
      ids.guideClaimRhsWatering,
      ids.guideClaimRhsPropagation,
      ids.guideClaimRhsWinter,
    ],
  ],
]);

const editorialCulturalRelationIdByPublicId = new Map([
  ["cultural-relation-wachuma-demo", "00000000-0000-4000-8000-000000000128"],
  [
    "cultural-relation-san-pedro-saraguro-2014",
    "00000000-0000-4000-8000-000000000187",
  ],
]);

const sourceIdByPublicId = new Map([
  ["source-wachuma-demo-editorial", ids.source],
  ["source-utn-echinopsis-pachanoi-habitat-2017", ids.sourceUtn],
  ["source-unprg-echinopsis-pachanoi-rhizosphere-2023", ids.sourceUnprg],
  ["source-untumbes-echinopsis-metabolomics-2020", ids.sourceUntumbes],
  ["source-scielo-echinopsis-pachanoi-rhizosphere-2025", ids.sourceScielo],
  ["source-rhs-cacti-succulents-guide", ids.sourceRhs],
]);

const seedSourceIdByPublicId = new Map([
  ["source-wachuma-demo-editorial", ids.source],
  ["source-utn-echinopsis-pachanoi-habitat-2017", ids.sourceUtn],
  ["source-unprg-echinopsis-pachanoi-rhizosphere-2023", ids.sourceUnprg],
  ["source-untumbes-echinopsis-metabolomics-2020", ids.sourceUntumbes],
  ["source-scielo-echinopsis-pachanoi-rhizosphere-2025", ids.sourceScielo],
  ["source-powo-echinopsis-pachanoi", ids.sourcePowo],
  ["source-gbif-echinopsis-pachanoi", ids.sourceGbif],
  ["source-rhs-cacti-succulents-guide", ids.sourceRhs],
  ["source-armijos-saraguro-yachakkuna-2014", ids.sourceSaraguro],
  ["source-gbif", ids.sourceGbifOccurrence],
]);

const editorialTaxonIdBySpeciesPublicId = new Map([
  ["biological-entity-echinopsis-pachanoi", ids.taxon],
]);

const editorialClaimIdByPublicId = new Map([
  ["claim-utn-echinopsis-pachanoi-habitat-model-2017", ids.claimUtn],
  ["claim-unprg-echinopsis-pachanoi-rhizosphere-2023", ids.claimUnprg],
  ["claim-scielo-echinopsis-pachanoi-rhizosphere-2025", ids.claimScielo],
  ["claim-untumbes-echinopsis-metabolomics-2020", ids.claimUntumbes],
  ["claim-powo-echinopsis-pachanoi-accepted", ids.claimPowo],
  ["claim-gbif-echinopsis-pachanoi-name-match", ids.claimGbif],
  [
    "claim-echinopsis-pachanoi-historical-combination",
    ids.claimEchinopsisHistory,
  ],
  ["claim-powo-echinopsis-pachanoi-native-range", ids.claimPowoRange],
  ["claim-powo-echinopsis-pachanoi-biome", ids.claimPowoBiome],
]);

const editorialSourceRecordIdByProviderRecordId = new Map([
  ["utn-handle:123456789/7458", ids.sourceRecordUtn],
  ["unprg-handle:20.500.12893/11487", ids.sourceRecordUnprg],
  [
    "untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
    ids.sourceRecordUntumbes,
  ],
  ["scielo-pid:S0187-57792025000100601", ids.sourceRecordScielo],
  ["taxon:88444-2", ids.sourceRecordPowo],
  ["species:5622352", ids.sourceRecordGbif],
]);

function resolveSeedSourceId(publicId: string): string {
  return (
    seedSourceIdByPublicId.get(publicId) ??
    deterministicUuid(`editorial-source:${publicId}`)
  );
}

function editorialGuideClaims(publicId: string) {
  const guide = editorialGuide(publicId);
  const claimIds = guideClaimIdsByPublicId.get(publicId);
  if (!guide || !claimIds) {
    throw new Error(`Editorial guide ${publicId} is not mapped in the seed`);
  }
  if (guide.claims.length !== claimIds.length) {
    throw new Error(
      `Editorial guide ${publicId} declares ${guide.claims.length} claims but the seed maps ${claimIds.length} ids`,
    );
  }
  return guide.claims.map((claim, index) => {
    const id = claimIds[index];
    const sourceId = sourceIdByPublicId.get(claim.sourcePublicId);
    if (!id || !sourceId) {
      throw new Error(
        `Editorial claim in ${publicId} has no deterministic id or source mapping`,
      );
    }
    return [
      id,
      claim.sectionKey,
      claim.statement,
      claim.evidenceLevel,
      claim.assertionType,
      sourceId,
    ] as const;
  });
}

function editorialGuide(publicId: string) {
  const guide = editorialContent.guides.find(
    (candidate) => candidate.publicId === publicId,
  );
  if (!guide) {
    throw new Error(`Editorial guide ${publicId} is missing from content`);
  }
  return guide;
}

const fixturePath = resolve(
  rootDirectory,
  "content/scenes/echinopsis-pachanoi-demo.json",
);
const modelPath = resolve(
  rootDirectory,
  "apps/web/public/models/echinopsis-pachanoi-demo.glb",
);

const fixtureText = await readFile(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText) as SceneFixture;
const modelBuffer = await readFile(modelPath);
const modelHash = createHash("sha256").update(modelBuffer).digest("hex");
const snapshotHash = createHash("sha256").update(fixtureText).digest("hex");

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function payloadChecksum(payload: Record<string, unknown>): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex")}`;
}

function deterministicUuid(namespace: string): string {
  const bytes = createHash("sha256").update(namespace).digest();
  const hex = [...bytes.subarray(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
    8 |
    (bytes[8]! & 0x3f)
  )
    .toString(16)
    .padStart(2, "0")}${hex.slice(18, 20)}-${hex.slice(20)}`;
}

const materialFixtureSourceId = ids.sourceMaterialFixture;
const materialFixtureSeeds = [
  {
    publicId: "material-study-echinopsis-pachanoi",
    biologicalEntityId: ids.biologicalEntity,
    growthStage: "adulto · lectura editorial de forma y cultivo",
    material: {
      baseColor: "#86a77b",
      roughness: 0.68,
      metallic: 0,
      transmission: 0.06,
      ior: 1.38,
      emissiveColor: "#d5e9c2",
      emissiveStrength: 0.12,
    },
    notes:
      "Estudio material procedural. Sus valores PBR son parámetros visuales y no representan composición química, reflectancia medida ni una reconstrucción científica.",
    bindings: [
      {
        publicId: "material-binding-echinopsis-morphology",
        layer: "morphology",
        target: "geometry",
        interpretation: "symbolic",
        notes:
          "La geometría puede evocar un cactus columnar; no sustituye una descripción morfológica ni una captura de ejemplar.",
      },
      {
        publicId: "material-binding-echinopsis-cultivation",
        layer: "cultivation",
        target: "animation",
        interpretation: "symbolic",
        notes:
          "La animación queda reservada para representar etapas del manual de cultivo cuando existan datos de ejemplares.",
      },
    ],
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;
const includeSyntheticDemoData =
  process.env.WACHUMA_SEED_PROFILE === "verification" ||
  process.env.WACHUMA_INCLUDE_DEMO_DATA === "true";
const demoVisibility = includeSyntheticDemoData ? "public" : "restricted";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed WACHUMA.");
}

const sql = postgres(databaseUrl);
let gbifOccurrenceSourceId: string = ids.sourceGbifOccurrence;

try {
  await sql.begin(async (transaction) => {
    const json = (value: unknown) => transaction.json(value as JsonValue);

    await transaction`
      INSERT INTO taxa (
        id, public_id, scientific_name, rank, taxonomic_status, description
      ) VALUES (
        ${ids.taxon},
        'taxon-echinopsis-pachanoi',
        'Echinopsis pachanoi',
        'species',
        'accepted',
        'Echinopsis pachanoi (Britton & Rose) H.Friedrich & G.D.Rowley. POWO la trata como especie aceptada; GBIF Backbone conserva una coincidencia con estado sinónimo. La representación 3D es editorial y no una reconstrucción científica.'
      )
      ON CONFLICT (id) DO UPDATE SET
        scientific_name = EXCLUDED.scientific_name,
        rank = EXCLUDED.rank,
        taxonomic_status = EXCLUDED.taxonomic_status,
        description = EXCLUDED.description,
        updated_at = now()
    `;

    await transaction`
      INSERT INTO biological_entities (
        id, public_id, entity_type, display_name, taxon_id, authority_note, visibility
      ) VALUES (
        ${ids.biologicalEntity},
        'biological-entity-echinopsis-pachanoi',
        'species',
        'Echinopsis pachanoi',
        ${ids.taxon},
        'Entidad editorial anclada a fuentes taxonómicas externas; no equipara nombres culturales con el taxón.',
        'public'
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        taxon_id = EXCLUDED.taxon_id,
        authority_note = EXCLUDED.authority_note,
        visibility = EXCLUDED.visibility,
        updated_at = now()
    `;

    for (const speciesDocument of editorialContent.species) {
      const [entity] = await transaction<{ id: string; taxon_id: string }[]>`
        SELECT id, taxon_id
        FROM biological_entities
        WHERE public_id = ${speciesDocument.publicId}
        LIMIT 1
      `;
      if (!entity) {
        throw new Error(
          `Editorial species ${speciesDocument.publicId} has no seeded biological entity identity`,
        );
      }
      await transaction`
        UPDATE taxa
        SET scientific_name = ${speciesDocument.scientificName},
            rank = ${speciesDocument.rank ?? "species"},
            taxonomic_status = ${speciesDocument.taxonomicStatus ?? "accepted"},
            description = ${speciesDocument.description ?? null},
            updated_at = now()
        WHERE id = ${entity.taxon_id}
      `;
      await transaction`
        UPDATE biological_entities
        SET entity_type = ${speciesDocument.entityType ?? "species"},
            display_name = ${speciesDocument.scientificName},
            authority_note = ${speciesDocument.authorityNote ?? null},
            visibility = ${speciesDocument.visibility ?? "public"},
            updated_at = now()
        WHERE id = ${entity.id}
      `;
    }

    for (const [id, publicId, visibility] of [
      [ids.specimenOne, "specimen-demo-01", "restricted"],
      [ids.specimenTwo, "specimen-demo-02", "restricted"],
      [ids.specimenPublic, "specimen-public-demo-01", "public"],
      [ids.specimenPublicChildOne, "specimen-public-child-01", "public"],
      [ids.specimenPublicChildTwo, "specimen-public-child-02", "public"],
    ] as const) {
      const seededVisibility = includeSyntheticDemoData
        ? visibility
        : "restricted";
      await transaction`
        INSERT INTO specimens (
          id, public_id, specimen_type, biological_entity_id, status, visibility, notes
        ) VALUES (
          ${id},
          ${publicId},
          'plant-live',
          ${ids.biologicalEntity},
          'alive',
          ${seededVisibility},
          'Ejemplar sintético para pruebas; no representa una ubicación real.'
        )
        ON CONFLICT (id) DO UPDATE SET
          biological_entity_id = EXCLUDED.biological_entity_id,
          status = EXCLUDED.status,
          visibility = EXCLUDED.visibility,
          notes = EXCLUDED.notes,
          updated_at = now()
      `;
    }

    const asset = fixture.assets[0];
    const recipe = fixture.recipes[0];
    if (!asset || !recipe) {
      throw new Error(
        "The demo fixture must contain one asset and one recipe.",
      );
    }
    if (modelHash !== asset.contentHash) {
      throw new Error(
        `Demo GLB hash mismatch: fixture=${asset.contentHash}, actual=${modelHash}`,
      );
    }

    await transaction`
      INSERT INTO media (
        id, media_type, uri, title, license_uri, attribution, visibility
      ) VALUES (
        ${ids.media},
        'model3d',
        ${asset.uri},
        ${asset.title ?? null},
        ${asset.license},
        ${asset.attribution},
        ${demoVisibility}
      )
      ON CONFLICT (id) DO UPDATE SET
        media_type = EXCLUDED.media_type,
        uri = EXCLUDED.uri,
        title = EXCLUDED.title,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        visibility = EXCLUDED.visibility
    `;

    await transaction`
      INSERT INTO sources (
        id, public_id, source_type, title, citation, url, license_uri,
        attribution, accessed_at
      ) VALUES (
        ${ids.sourceGarden},
        'source-wachuma-garden-ledger',
        'editorial',
        'WACHUMA · registro interno del jardín',
        'Registro interno de ejemplares y observaciones del jardín WACHUMA; cada entrada conserva su propia procedencia y alcance de publicación.',
        'https://github.com/ligereza/WACHUMA',
        'WACHUMA-GARDEN-PRIVATE',
        'WACHUMA; los nombres de custodios y ubicaciones exactas no se publican por defecto.',
        '2026-08-23T00:00:00Z'
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        source_type = EXCLUDED.source_type,
        title = EXCLUDED.title,
        citation = EXCLUDED.citation,
        url = EXCLUDED.url,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        accessed_at = EXCLUDED.accessed_at
    `;

    await transaction`
      INSERT INTO sources (
        id, public_id, source_type, title, citation, url, license_uri,
        attribution, accessed_at
      ) VALUES (
        ${materialFixtureSourceId},
        'source-wachuma-material-fixture',
        'editorial',
        'WACHUMA · estudios materiales procedurales',
        'Registro editorial de decisiones visuales para representar organismos como estudios materiales. No contiene mediciones químicas ni pretende reconstruir científicamente un organismo.',
        'https://github.com/ligereza/WACHUMA',
        'WACHUMA-PROJECT',
        'WACHUMA; estudio visual procedural con parámetros y límites declarados.',
        '2026-08-24T00:00:00Z'
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        source_type = EXCLUDED.source_type,
        title = EXCLUDED.title,
        citation = EXCLUDED.citation,
        url = EXCLUDED.url,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        accessed_at = EXCLUDED.accessed_at
    `;

    await transaction`
      INSERT INTO data_sources (
        id, provider_key, name, source_type, base_url, terms_url,
        default_license_uri
      ) VALUES (
        ${ids.dataSourcePowo},
        'powo',
        'Plants of the World Online',
        'external_dataset',
        'https://powo.science.kew.org',
        'https://powo.science.kew.org/terms-and-conditions',
        'CC BY 3.0'
      )
      ON CONFLICT (id) DO UPDATE SET
        provider_key = EXCLUDED.provider_key,
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        terms_url = EXCLUDED.terms_url,
        default_license_uri = EXCLUDED.default_license_uri
    `;

    await transaction`
      INSERT INTO data_sources (
        id, provider_key, name, source_type, base_url, terms_url,
        default_license_uri
      ) VALUES (
        ${ids.dataSourceGbif},
        'gbif',
        'GBIF Backbone Taxonomy',
        'external_dataset',
        'https://api.gbif.org/v1',
        'https://www.gbif.org/terms',
        'CC BY 4.0'
      )
      ON CONFLICT (id) DO UPDATE SET
        provider_key = EXCLUDED.provider_key,
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        terms_url = EXCLUDED.terms_url,
        default_license_uri = EXCLUDED.default_license_uri
    `;

    await transaction`
      INSERT INTO data_sources (
        id, provider_key, name, source_type, base_url, terms_url,
        default_license_uri
      ) VALUES (
        ${ids.dataSourceSaraguro},
        'academic-saraguro-2014',
        'Armijos, Cota & González · Saraguro yachakkuna',
        'academic_publication',
        'https://link.springer.com/article/10.1186/1746-4269-10-26',
        'https://creativecommons.org/licenses/by/2.0/',
        'CC BY 2.0'
      )
      ON CONFLICT (id) DO UPDATE SET
        provider_key = EXCLUDED.provider_key,
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        terms_url = EXCLUDED.terms_url,
        default_license_uri = EXCLUDED.default_license_uri
    `;

    await transaction`
      INSERT INTO data_sources (
        id, provider_key, name, source_type, base_url, terms_url,
        default_license_uri
      ) VALUES (
        ${ids.dataSourceGarden},
        'wachuma-garden',
        'WACHUMA · registro interno del jardín',
        'internal_registry',
        'https://github.com/ligereza/WACHUMA',
        'https://github.com/ligereza/WACHUMA/blob/main/docs/governance/release-readiness-v0.1.md',
        'WACHUMA-GARDEN-PRIVATE'
      )
      ON CONFLICT (id) DO UPDATE SET
        provider_key = EXCLUDED.provider_key,
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        terms_url = EXCLUDED.terms_url,
        default_license_uri = EXCLUDED.default_license_uri
    `;

    await transaction`
      INSERT INTO data_sources (
        id, provider_key, name, source_type, base_url, terms_url,
        default_license_uri
      ) VALUES (
        ${ids.dataSourceWebPages},
        'web-page',
        'WACHUMA · cosecha allowlist de páginas sobre Echinopsis pachanoi',
        'external_dataset',
        'https://github.com/ligereza/WACHUMA',
        'https://github.com/ligereza/WACHUMA/blob/main/docs/data/pachanoi-source-harvest-2026-08-27.md',
        'per-record-review'
      )
      ON CONFLICT (id) DO UPDATE SET
        provider_key = EXCLUDED.provider_key,
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        terms_url = EXCLUDED.terms_url,
        default_license_uri = EXCLUDED.default_license_uri
    `;

    const pachanoiPageSourceRecords = [
      {
        id: ids.sourceRecordUtn,
        sourcePublicId: "source-utn-echinopsis-pachanoi-habitat-2017",
        sourceRecordId: "utn-handle:123456789/7458",
      },
      {
        id: ids.sourceRecordUnprg,
        sourcePublicId: "source-unprg-echinopsis-pachanoi-rhizosphere-2023",
        sourceRecordId: "unprg-handle:20.500.12893/11487",
      },
      {
        id: ids.sourceRecordUntumbes,
        sourcePublicId: "source-untumbes-echinopsis-metabolomics-2020",
        sourceRecordId: "untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
      },
      {
        id: ids.sourceRecordScielo,
        sourcePublicId: "source-scielo-echinopsis-pachanoi-rhizosphere-2025",
        sourceRecordId: "scielo-pid:S0187-57792025000100601",
      },
    ] as const;
    for (const pageRecord of pachanoiPageSourceRecords) {
      const editorialSource = editorialContent.sources.find(
        (source) => source.publicId === pageRecord.sourcePublicId,
      );
      if (!editorialSource?.url || !editorialSource.accessedAt) {
        throw new Error(
          `Editorial page source ${pageRecord.sourcePublicId} needs URL and accessedAt`,
        );
      }
      const rawPayload = {
        sourcePublicId: pageRecord.sourcePublicId,
        sourceRecordId: pageRecord.sourceRecordId,
        sourceUrl: editorialSource.url,
        retrievedAt: editorialSource.accessedAt,
        accessStatus: "fetched-metadata",
        metadataOnly: true,
        rawContentStored: false,
        imagesDownloaded: false,
        importer: "pachanoi-page-harvester-v0.2.1",
      };
      await transaction`
        INSERT INTO source_records (
          id, data_source_id, source_record_id, source_url, retrieved_at,
          license_uri, attribution, assertion_type, raw_payload, raw_checksum,
          importer_version, status
        ) VALUES (
          ${pageRecord.id},
          ${ids.dataSourceWebPages},
          ${pageRecord.sourceRecordId},
          ${editorialSource.url},
          ${editorialSource.accessedAt},
          ${editorialSource.license},
          ${editorialSource.attribution},
          'academic_publication',
          ${json(rawPayload)},
          ${payloadChecksum(rawPayload)},
          'pachanoi-page-harvester-v0.2.1',
          'pending'
        )
        ON CONFLICT (id) DO UPDATE SET
          data_source_id = EXCLUDED.data_source_id,
          source_record_id = EXCLUDED.source_record_id,
          source_url = EXCLUDED.source_url,
          retrieved_at = EXCLUDED.retrieved_at,
          license_uri = EXCLUDED.license_uri,
          attribution = EXCLUDED.attribution,
          assertion_type = EXCLUDED.assertion_type,
          raw_payload = EXCLUDED.raw_payload,
          raw_checksum = EXCLUDED.raw_checksum,
          importer_version = EXCLUDED.importer_version,
          status = EXCLUDED.status
      `;
    }

    await transaction`
      INSERT INTO source_records (
        id, data_source_id, source_record_id, source_url, retrieved_at,
        license_uri, attribution, assertion_type, raw_payload, raw_checksum,
        importer_version, status
      ) VALUES (
        ${ids.sourceRecordPowo},
        ${ids.dataSourcePowo},
        'taxon:88444-2',
        'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:88444-2/general-information',
        '2026-08-23T00:00:00Z',
        'CC BY 3.0',
        'Plants of the World Online; Royal Botanic Gardens, Kew.',
        'taxonomic_fact',
        ${json({
          scientificName:
            "Echinopsis pachanoi (Britton & Rose) H.Friedrich & G.D.Rowley",
          accepted: true,
          nativeRange: "Southern Ecuador to Peru",
          biome: "seasonally dry tropical biome",
          ipniNameId: "88444-2",
        })},
        'sha256:seed-powo-echinopsis-pachanoi-2026-08-23',
        'powo-manual-review-0.1.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        data_source_id = EXCLUDED.data_source_id,
        source_record_id = EXCLUDED.source_record_id,
        source_url = EXCLUDED.source_url,
        retrieved_at = EXCLUDED.retrieved_at,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        assertion_type = EXCLUDED.assertion_type,
        raw_payload = EXCLUDED.raw_payload,
        raw_checksum = EXCLUDED.raw_checksum,
        importer_version = EXCLUDED.importer_version,
        status = EXCLUDED.status
    `;

    await transaction`
      INSERT INTO source_records (
        id, data_source_id, source_record_id, source_url, retrieved_at,
        license_uri, attribution, assertion_type, raw_payload, raw_checksum,
        importer_version, status
      ) VALUES (
        ${ids.sourceRecordLineageDemo},
        ${ids.dataSourceGarden},
        'lineage:demo-echinopsis:v1',
        'https://github.com/ligereza/WACHUMA',
        '2026-08-23T00:00:00Z',
        'WACHUMA-GARDEN-PRIVATE',
        'WACHUMA; relación sintética de prueba, no evidencia de material real.',
        'editorial_interpretation',
        ${json({
          synthetic: true,
          purpose: "public lineage contract test",
          note: "The relationship is a fixture and must not be read as a real garden record.",
        })},
        'sha256:seed-lineage-demo-v1',
        'seed-editorial-lineage-0.1.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        data_source_id = EXCLUDED.data_source_id,
        source_record_id = EXCLUDED.source_record_id,
        source_url = EXCLUDED.source_url,
        retrieved_at = EXCLUDED.retrieved_at,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        assertion_type = EXCLUDED.assertion_type,
        raw_payload = EXCLUDED.raw_payload,
        raw_checksum = EXCLUDED.raw_checksum,
        importer_version = EXCLUDED.importer_version,
        status = EXCLUDED.status
    `;

    await transaction`
      INSERT INTO source_records (
        id, data_source_id, source_record_id, source_url, retrieved_at,
        license_uri, attribution, assertion_type, raw_payload, raw_checksum,
        importer_version, status
      ) VALUES (
        ${ids.sourceRecordGbif},
        ${ids.dataSourceGbif},
        'species:5622352',
        'https://www.gbif.org/species/5622352',
        '2026-08-23T00:00:00Z',
        'CC BY 4.0',
        'GBIF Secretariat; GBIF Backbone Taxonomy.',
        'taxonomic_fact',
        ${json({
          requestedName: "Echinopsis pachanoi",
          usageKey: 5622352,
          acceptedUsageKey: 11093098,
          scientificName:
            "Echinopsis pachanoi (Britton & Rose) H.Friedrich & G.D.Rowley",
          status: "SYNONYM",
          matchType: "EXACT",
          confidence: 98,
        })},
        'sha256:seed-gbif-echinopsis-pachanoi-2026-08-23',
        'gbif-manual-review-0.1.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        data_source_id = EXCLUDED.data_source_id,
        source_record_id = EXCLUDED.source_record_id,
        source_url = EXCLUDED.source_url,
        retrieved_at = EXCLUDED.retrieved_at,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        assertion_type = EXCLUDED.assertion_type,
        raw_payload = EXCLUDED.raw_payload,
        raw_checksum = EXCLUDED.raw_checksum,
        importer_version = EXCLUDED.importer_version,
        status = EXCLUDED.status
    `;

    await transaction`
      INSERT INTO source_records (
        id, data_source_id, source_record_id, source_url, retrieved_at,
        license_uri, attribution, assertion_type, raw_payload, raw_checksum,
        importer_version, status
      ) VALUES (
        ${ids.sourceRecordSaraguro},
        ${ids.dataSourceSaraguro},
        'publication:10.1186/1746-4269-10-26',
        'https://link.springer.com/article/10.1186/1746-4269-10-26',
        '2026-08-23T00:00:00Z',
        'CC BY 2.0',
        'Armijos, C.; Cota, I.; González, S.; licenciatario BioMed Central.',
        'academic_publication',
        ${json({
          doi: "10.1186/1746-4269-10-26",
          studyPeriod: "2010-2011",
          studyContext:
            "Entrevistas con diez yachakkuna seleccionados por el Consejo de Sanadores de Saraguro.",
          scopedRelation:
            "El artículo registra el nombre San Pedro para Echinopsis pachanoi en ese contexto de estudio.",
          rightsNote:
            "No se redistribuye el artículo ni sus tablas; se conserva metadata y una paráfrasis editorial acotada.",
        })},
        'sha256:seed-armijos-saraguro-yachakkuna-2014',
        'academic-source-manual-review-0.1.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        data_source_id = EXCLUDED.data_source_id,
        source_record_id = EXCLUDED.source_record_id,
        source_url = EXCLUDED.source_url,
        retrieved_at = EXCLUDED.retrieved_at,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        assertion_type = EXCLUDED.assertion_type,
        raw_payload = EXCLUDED.raw_payload,
        raw_checksum = EXCLUDED.raw_checksum,
        importer_version = EXCLUDED.importer_version,
        status = EXCLUDED.status
    `;

    for (const [sourceRecordId, note, taxonomyConfirmed] of [
      [
        ids.sourceRecordPowo,
        "Seed editorial: licencia, atribución, checksum y alcance taxonómico revisados.",
        true,
      ],
      [
        ids.sourceRecordGbif,
        "Seed editorial: licencia, atribución, checksum y alcance taxonómico revisados.",
        true,
      ],
      [
        ids.sourceRecordSaraguro,
        "Seed editorial: fuente académica, atribución y sensibilidad conservadas; la relación cultural permanece restringida y bajo revisión comunitaria.",
        false,
      ],
      [
        ids.sourceRecordLineageDemo,
        "Fixture sintético para comprobar el contrato público de lineage; no representa material real ni autorización de custodia.",
        false,
      ],
    ] as const) {
      await transaction`
        INSERT INTO source_record_reviews (
          source_record_id, reviewer, decision, note,
          license_confirmed, attribution_confirmed, privacy_confirmed,
          taxonomy_confirmed, reviewed_at, review_kind
        )
        SELECT
          ${sourceRecordId},
          'seed-editorial',
          'accepted',
          ${note},
          true,
          true,
          true,
          ${taxonomyConfirmed},
          '2026-08-23T00:00:00Z',
          'publication'
        WHERE NOT EXISTS (
          SELECT 1
          FROM source_record_reviews AS existing_review
          WHERE existing_review.source_record_id = ${sourceRecordId}
            AND existing_review.review_kind = 'publication'
            AND existing_review.decision = 'accepted'
      )
    `;

      await transaction`
        UPDATE source_records
        SET review_notes = ${note},
            reviewed_by = 'seed-editorial',
            reviewed_at = '2026-08-23T00:00:00Z'
        WHERE id = ${sourceRecordId}
          AND status = 'accepted'
      `;
    }

    for (const source of editorialContent.sources) {
      if (!source.sourceType) {
        throw new Error(`Editorial source ${source.publicId} needs sourceType`);
      }
      const [persistedSource] = await transaction<{ id: string }[]>`
        INSERT INTO sources (
          id, public_id, source_type, title, citation, url, doi, license_uri,
          attribution, published_on, accessed_at
        ) VALUES (
          ${resolveSeedSourceId(source.publicId)},
          ${source.publicId},
          ${source.sourceType},
          ${source.title},
          ${source.citation},
          ${source.url ?? null},
          ${source.doi ?? null},
          ${source.license},
          ${source.attribution},
          ${source.publishedOn ?? null},
          ${source.accessedAt ?? null}
        )
        ON CONFLICT (public_id) DO UPDATE SET
          source_type = EXCLUDED.source_type,
          title = EXCLUDED.title,
          citation = EXCLUDED.citation,
          url = EXCLUDED.url,
          doi = EXCLUDED.doi,
          license_uri = EXCLUDED.license_uri,
          attribution = EXCLUDED.attribution,
          published_on = EXCLUDED.published_on,
          accessed_at = EXCLUDED.accessed_at
        RETURNING id
      `;
      if (!persistedSource) {
        throw new Error(
          `Editorial source ${source.publicId} could not be persisted`,
        );
      }
      if (source.publicId === "source-gbif") {
        gbifOccurrenceSourceId = persistedSource.id;
      }
    }

    for (const speciesDocument of editorialContent.species) {
      const [entity] = await transaction<{ id: string; taxon_id: string }[]>`
        SELECT id, taxon_id
        FROM biological_entities
        WHERE public_id = ${speciesDocument.publicId}
        LIMIT 1
      `;
      if (!entity) {
        throw new Error(
          `Editorial species ${speciesDocument.publicId} has no seeded identity for external identifiers`,
        );
      }
      for (const identifier of speciesDocument.externalIdentifiers ?? []) {
        if (!identifier.license) {
          throw new Error(
            `External identifier ${identifier.namespace}:${identifier.identifier} needs a license`,
          );
        }
        await transaction`
          INSERT INTO external_identifiers (
            namespace, identifier, canonical_url, retrieved_at, license_uri,
            taxon_id
          ) VALUES (
            ${identifier.namespace},
            ${identifier.identifier},
            ${identifier.canonicalUrl ?? null},
            '2026-08-23T00:00:00Z',
            ${identifier.license},
            ${entity.taxon_id}
          )
          ON CONFLICT (namespace, identifier) DO UPDATE SET
            canonical_url = EXCLUDED.canonical_url,
            retrieved_at = EXCLUDED.retrieved_at,
            license_uri = EXCLUDED.license_uri,
            taxon_id = EXCLUDED.taxon_id
        `;
      }
    }

    await transaction`
      INSERT INTO external_identifiers (
        namespace, identifier, canonical_url, retrieved_at, license_uri, taxon_id
      ) VALUES
        ('ipni', '88444-2', 'https://www.ipni.org/n/88444-2', '2026-08-23T00:00:00Z', 'CC BY 3.0', ${ids.taxon}),
        ('gbif', '5622352', 'https://www.gbif.org/species/5622352', '2026-08-23T00:00:00Z', 'CC BY 4.0', ${ids.taxon}),
        ('gbif', '11093098', 'https://www.gbif.org/species/11093098', '2026-08-23T00:00:00Z', 'CC BY 4.0', ${ids.taxon})
      ON CONFLICT (namespace, identifier) DO UPDATE SET
        canonical_url = EXCLUDED.canonical_url,
        retrieved_at = EXCLUDED.retrieved_at,
        license_uri = EXCLUDED.license_uri,
        taxon_id = EXCLUDED.taxon_id
    `;

    await transaction`
      INSERT INTO record_provenance (
        source_record_id, external_identifier_id, source_id, assertion_type
      )
        SELECT
          mapping.source_record_id::uuid,
          external_identifier.id,
          mapping.source_id::uuid,
          'taxonomic_fact'
      FROM (
        VALUES
          (${ids.sourceRecordPowo}, 'ipni', '88444-2', ${ids.sourcePowo}),
          (${ids.sourceRecordGbif}, 'gbif', '5622352', ${ids.sourceGbif}),
          (${ids.sourceRecordGbif}, 'gbif', '11093098', ${ids.sourceGbif})
      ) AS mapping(source_record_id, namespace, identifier, source_id)
      JOIN external_identifiers AS external_identifier
        ON external_identifier.namespace = mapping.namespace
       AND external_identifier.identifier = mapping.identifier
      ON CONFLICT DO NOTHING
    `;

    await transaction`
      INSERT INTO record_provenance (
        source_record_id, taxon_id, assertion_type
      ) VALUES
        (${ids.sourceRecordPowo}, ${ids.taxon}, 'taxonomic_fact'),
        (${ids.sourceRecordGbif}, ${ids.taxon}, 'taxonomic_fact')
      ON CONFLICT DO NOTHING
    `;

    await transaction`
      INSERT INTO record_provenance (
        source_record_id, biological_entity_id, assertion_type
      ) VALUES
        (${ids.sourceRecordPowo}, ${ids.biologicalEntity}, 'taxonomic_fact'),
        (${ids.sourceRecordGbif}, ${ids.biologicalEntity}, 'taxonomic_fact')
      ON CONFLICT DO NOTHING
    `;

    await transaction`
      INSERT INTO claims (
        id, public_id, subject_type, subject_id, predicate, object_text,
        assertion_type, evidence_level, source_id, source_record_id,
        author_perspective, recorded_on, visibility, license_uri, review_status
      ) VALUES (
        ${ids.claimPowo},
        'claim-powo-echinopsis-pachanoi-accepted',
        'taxon',
        ${ids.taxon},
        'taxonomicStatus',
        'POWO registra Echinopsis pachanoi como especie aceptada; su rango nativo se indica desde el sur de Ecuador hasta Perú.',
        'taxonomic_fact',
        'documented',
        ${ids.sourcePowo},
        ${ids.sourceRecordPowo},
        'Plants of the World Online; lectura editorial de WACHUMA.',
        '2026-08-23',
        'public',
        'CC BY 3.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        object_text = EXCLUDED.object_text,
        source_id = EXCLUDED.source_id,
        source_record_id = EXCLUDED.source_record_id,
        author_perspective = EXCLUDED.author_perspective,
        recorded_on = EXCLUDED.recorded_on,
        visibility = EXCLUDED.visibility,
        license_uri = EXCLUDED.license_uri,
        review_status = EXCLUDED.review_status,
        updated_at = now()
    `;

    await transaction`
      INSERT INTO claims (
        id, public_id, subject_type, subject_id, predicate, object_text,
        assertion_type, evidence_level, source_id, source_record_id,
        author_perspective, recorded_on, visibility, license_uri, review_status
      ) VALUES (
        ${ids.claimGbif},
        'claim-gbif-echinopsis-pachanoi-name-match',
        'taxon',
        ${ids.taxon},
        'gbifNameMatch',
        'GBIF Backbone devuelve una coincidencia exacta para Echinopsis pachanoi, con estado SYNONYM y acceptedUsageKey 11093098.',
        'taxonomic_fact',
        'documented',
        ${ids.sourceGbif},
        ${ids.sourceRecordGbif},
        'GBIF Backbone Taxonomy; se conserva la diferencia con la evaluación editorial de POWO.',
        '2026-08-23',
        'public',
        'CC BY 4.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        object_text = EXCLUDED.object_text,
        source_id = EXCLUDED.source_id,
        source_record_id = EXCLUDED.source_record_id,
        author_perspective = EXCLUDED.author_perspective,
        recorded_on = EXCLUDED.recorded_on,
        visibility = EXCLUDED.visibility,
        license_uri = EXCLUDED.license_uri,
        review_status = EXCLUDED.review_status,
        updated_at = now()
      `;

    for (const [id, publicId, predicate, objectText] of [
      [
        ids.claimPowoRange,
        "claim-powo-echinopsis-pachanoi-native-range",
        "nativeRange",
        "Plants of the World Online indica un rango nativo desde el sur de Ecuador hasta Perú.",
      ],
      [
        ids.claimPowoBiome,
        "claim-powo-echinopsis-pachanoi-biome",
        "biome",
        "Plants of the World Online vincula la especie con un bioma tropical estacionalmente seco.",
      ],
    ] as const) {
      await transaction`
        INSERT INTO claims (
          id, public_id, subject_type, subject_id, predicate, object_text,
          assertion_type, evidence_level, source_id, source_record_id,
          author_perspective, recorded_on, visibility, license_uri, review_status
        ) VALUES (
          ${id}, ${publicId}, 'taxon', ${ids.taxon}, ${predicate}, ${objectText},
          'taxonomic_fact', 'documented', ${ids.sourcePowo},
          ${ids.sourceRecordPowo},
          'Plants of the World Online; lectura editorial de WACHUMA.',
          '2026-08-23', 'public', 'CC BY 3.0', 'accepted'
        )
        ON CONFLICT (id) DO UPDATE SET
          public_id = EXCLUDED.public_id,
          predicate = EXCLUDED.predicate,
          object_text = EXCLUDED.object_text,
          source_id = EXCLUDED.source_id,
          source_record_id = EXCLUDED.source_record_id,
          author_perspective = EXCLUDED.author_perspective,
          recorded_on = EXCLUDED.recorded_on,
          visibility = EXCLUDED.visibility,
          license_uri = EXCLUDED.license_uri,
          review_status = EXCLUDED.review_status,
          updated_at = now()
      `;
    }

    for (const [claimId, sourceId, sourceRecordId] of [
      [ids.claimPowoRange, ids.sourcePowo, ids.sourceRecordPowo],
      [ids.claimPowoBiome, ids.sourcePowo, ids.sourceRecordPowo],
    ] as const) {
      await transaction`
        INSERT INTO claim_sources (claim_id, source_id, source_record_id, role)
        VALUES (${claimId}, ${sourceId}, ${sourceRecordId}, 'primary')
        ON CONFLICT (claim_id, source_id) DO UPDATE SET
          source_record_id = EXCLUDED.source_record_id,
          role = EXCLUDED.role
      `;
    }

    for (const [claimId, sourceId, sourceRecordId] of [
      [ids.claimPowo, ids.sourcePowo, ids.sourceRecordPowo],
      [ids.claimGbif, ids.sourceGbif, ids.sourceRecordGbif],
    ] as const) {
      await transaction`
        INSERT INTO claim_sources (claim_id, source_id, source_record_id, role)
        VALUES (${claimId}, ${sourceId}, ${sourceRecordId}, 'primary')
        ON CONFLICT (claim_id, source_id) DO UPDATE SET
          source_record_id = EXCLUDED.source_record_id,
          role = EXCLUDED.role
      `;
    }

    // The deterministic IDs above preserve fixture identity across seeds;
    // content/species is the editorial source of truth for the claim values.
    for (const speciesDocument of editorialContent.species) {
      const taxonId = editorialTaxonIdBySpeciesPublicId.get(
        speciesDocument.publicId,
      );
      if (!taxonId) {
        throw new Error(
          `Editorial species ${speciesDocument.publicId} has no deterministic taxon identity`,
        );
      }
      for (const claim of speciesDocument.claims ?? []) {
        const claimId = editorialClaimIdByPublicId.get(claim.publicId);
        const sourceId = seedSourceIdByPublicId.get(claim.sourcePublicId);
        const sourceRecordId = editorialSourceRecordIdByProviderRecordId.get(
          claim.sourceRecordId,
        );
        const source = editorialContent.sources.find(
          (candidate) => candidate.publicId === claim.sourcePublicId,
        );
        if (!claimId || !sourceId || !sourceRecordId || !source) {
          throw new Error(
            `Editorial species claim ${claim.publicId} has no deterministic identity, source or source record mapping`,
          );
        }
        await transaction`
          INSERT INTO claims (
            id, public_id, subject_type, subject_id, predicate, object_text,
            assertion_type, evidence_level, source_id, source_record_id,
            author_perspective, recorded_on, visibility, license_uri, review_status
          ) VALUES (
            ${claimId}, ${claim.publicId}, 'taxon', ${taxonId},
            ${claim.predicate}, ${claim.statement}, ${claim.assertionType},
            ${claim.evidenceLevel}, ${sourceId}, ${sourceRecordId},
            ${claim.authorPerspective}, ${claim.recordedOn}, ${claim.visibility},
            ${source.license}, ${claim.reviewStatus}
          )
          ON CONFLICT (id) DO UPDATE SET
            public_id = EXCLUDED.public_id,
            subject_type = EXCLUDED.subject_type,
            subject_id = EXCLUDED.subject_id,
            predicate = EXCLUDED.predicate,
            object_text = EXCLUDED.object_text,
            assertion_type = EXCLUDED.assertion_type,
            evidence_level = EXCLUDED.evidence_level,
            source_id = EXCLUDED.source_id,
            source_record_id = EXCLUDED.source_record_id,
            author_perspective = EXCLUDED.author_perspective,
            recorded_on = EXCLUDED.recorded_on,
            visibility = EXCLUDED.visibility,
            license_uri = EXCLUDED.license_uri,
            review_status = EXCLUDED.review_status,
            updated_at = now()
        `;
        await transaction`
          DELETE FROM claim_sources
          WHERE claim_id = ${claimId}
        `;
        await transaction`
          INSERT INTO claim_sources (claim_id, source_id, source_record_id, role)
          VALUES (${claimId}, ${sourceId}, ${sourceRecordId}, 'primary')
          ON CONFLICT (claim_id, source_id) DO UPDATE SET
            source_record_id = EXCLUDED.source_record_id,
            role = EXCLUDED.role
        `;
      }
    }

    await transaction`
      INSERT INTO agents (
        id, public_id, agent_type, public_name, is_public
      ) VALUES (
        ${ids.agentDemo},
        'agent-wachuma-editorial-demo',
        'editorial',
        'WACHUMA · equipo editorial demo',
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        agent_type = EXCLUDED.agent_type,
        public_name = EXCLUDED.public_name,
        is_public = EXCLUDED.is_public
    `;

    await transaction`
      INSERT INTO agents (
        id, public_id, agent_type, public_name, is_public
      ) VALUES (
        ${ids.agentSaraguroStudy},
        'agent-armijos-cota-gonzalez-2014',
        'person',
        'Armijos, Cota & González · autores del estudio Saraguro',
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        agent_type = EXCLUDED.agent_type,
        public_name = EXCLUDED.public_name,
        is_public = EXCLUDED.is_public
    `;

    await transaction`
      INSERT INTO protocols (
        id, public_id, protocol_type, title, version, description,
        source_id, license_uri, access_level, status
      ) VALUES (
        ${ids.protocolDemo},
        'protocol-wachuma-observation-demo',
        'observation',
        'Protocolo de observación WACHUMA · demo',
        '1.0',
        'Protocolo sintético para separar una observación fechada de una recomendación de cultivo.',
        ${ids.source},
        'WACHUMA-PROJECT',
        ${demoVisibility},
        'published'
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        protocol_type = EXCLUDED.protocol_type,
        title = EXCLUDED.title,
        version = EXCLUDED.version,
        description = EXCLUDED.description,
        source_id = EXCLUDED.source_id,
        license_uri = EXCLUDED.license_uri,
        access_level = EXCLUDED.access_level,
        status = EXCLUDED.status,
        updated_at = now()
    `;

    await transaction`
      INSERT INTO trait_definitions (
        id, namespace, identifier, label, value_type, preferred_unit,
        description, source_id
      ) VALUES (
        ${ids.traitDefinitionHeight},
        'WACHUMA',
        'height_cm',
        'Altura del ejemplar',
        'numeric',
        'cm',
        'Medición sintética para validar rasgos versionables y atribuibles.',
        ${ids.source}
      )
      ON CONFLICT (id) DO UPDATE SET
        namespace = EXCLUDED.namespace,
        identifier = EXCLUDED.identifier,
        label = EXCLUDED.label,
        value_type = EXCLUDED.value_type,
        preferred_unit = EXCLUDED.preferred_unit,
        description = EXCLUDED.description,
        source_id = EXCLUDED.source_id
    `;

    await transaction`
      INSERT INTO historical_periods (
        id, public_id, name, description, source_id
      ) VALUES (
        ${ids.historicalPeriodDemo},
        'period-wachuma-demo',
        'Periodo demo sin afirmación histórica',
        'Contexto sintético para probar el vínculo de una relación cultural con un periodo; no representa una periodización documentada.',
        ${ids.source}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        source_id = EXCLUDED.source_id
    `;

    await transaction`
      INSERT INTO historical_periods (
        id, public_id, name, description, starts_on, ends_on, source_id
      ) VALUES (
        ${ids.historicalPeriodSaraguro},
        'period-saraguro-interviews-2010-2011',
        'Entrevistas a yachakkuna Saraguro · 2010–2011',
        'Periodo de campo indicado por Armijos, Cota y González para entrevistas con yachakkuna seleccionados por el Consejo de Sanadores de Saraguro.',
        '2010-01-01',
        '2011-12-31',
        ${ids.sourceSaraguro}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        starts_on = EXCLUDED.starts_on,
        ends_on = EXCLUDED.ends_on,
        source_id = EXCLUDED.source_id
    `;

    if (includeSyntheticDemoData) {
      await transaction`
        INSERT INTO cultures (
          id, public_id, specimen_id, culture_type, generation_label,
          medium, status
        ) VALUES (
          ${ids.cultureDemo},
          'culture-demo-public-agar',
          ${ids.specimenPublic},
          'agar',
          'G1',
          'medio sintético de demostración',
          'active'
        )
        ON CONFLICT (id) DO UPDATE SET
          public_id = EXCLUDED.public_id,
          specimen_id = EXCLUDED.specimen_id,
          culture_type = EXCLUDED.culture_type,
          generation_label = EXCLUDED.generation_label,
          medium = EXCLUDED.medium,
          status = EXCLUDED.status
      `;
    }

    if (!includeSyntheticDemoData) {
      await transaction`
        DELETE FROM record_provenance
        WHERE growing_guide_id = (
          SELECT id FROM growing_guides
          WHERE public_id = 'guide-echinopsis-pachanoi-demo-v1'
        )
      `;
      await transaction`
        DELETE FROM growing_guide_claims
        WHERE growing_guide_id = (
          SELECT id FROM growing_guides
          WHERE public_id = 'guide-echinopsis-pachanoi-demo-v1'
        )
      `;
      await transaction`
        DELETE FROM growing_guides
        WHERE public_id = 'guide-echinopsis-pachanoi-demo-v1'
      `;
      await transaction`
        DELETE FROM record_provenance
        WHERE cultural_relation_id IN (
          SELECT cultural.id
          FROM cultural_relations AS cultural
          JOIN cultures AS culture ON culture.id = cultural.culture_id
          WHERE culture.public_id = 'culture-demo-public-agar'
        )
      `;
      await transaction`
        DELETE FROM cultural_relations
        WHERE culture_id = (
          SELECT id FROM cultures
          WHERE public_id = 'culture-demo-public-agar'
        )
      `;
      await transaction`
        DELETE FROM cultures
        WHERE public_id = 'culture-demo-public-agar'
      `;
    }

    if (includeSyntheticDemoData) {
      const demoGuide = editorialGuide("guide-echinopsis-pachanoi-demo-v1");
      await transaction`
      INSERT INTO growing_guides (
        id, public_id, guide_key, version, title, biological_entity_id,
        climate_context, technique_context, region_context, status, summary
      ) VALUES (
        ${ids.guide},
        ${demoGuide.publicId},
        ${demoGuide.guideKey},
        ${demoGuide.version},
        ${demoGuide.title},
        ${ids.biologicalEntity},
        'Pendiente de definir con fuentes y región',
        'Documento estructurado de prueba',
        'No especificada',
        ${demoGuide.status},
        ${demoGuide.summary ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        guide_key = EXCLUDED.guide_key,
        version = EXCLUDED.version,
        title = EXCLUDED.title,
        biological_entity_id = EXCLUDED.biological_entity_id,
        climate_context = EXCLUDED.climate_context,
        technique_context = EXCLUDED.technique_context,
        region_context = EXCLUDED.region_context,
        status = EXCLUDED.status,
        summary = EXCLUDED.summary
      `;

      for (const [
        id,
        sectionKey,
        statement,
        evidenceLevel,
        assertionType,
        sourceId,
      ] of editorialGuideClaims("guide-echinopsis-pachanoi-demo-v1")) {
        await transaction`
        INSERT INTO growing_guide_claims (
          id, growing_guide_id, section_key, statement, evidence_level,
          source_id, assertion_type
        ) VALUES (
          ${id}, ${ids.guide}, ${sectionKey}, ${statement}, ${evidenceLevel},
          ${sourceId}, ${assertionType}
        )
        ON CONFLICT (id) DO UPDATE SET
          growing_guide_id = EXCLUDED.growing_guide_id,
          section_key = EXCLUDED.section_key,
          statement = EXCLUDED.statement,
          evidence_level = EXCLUDED.evidence_level,
          source_id = EXCLUDED.source_id,
          assertion_type = EXCLUDED.assertion_type
        `;
      }
    }

    const echinopsisGuide = editorialGuide(
      "guide-echinopsis-pachanoi-general-cacti-v1",
    );
    await transaction`
      INSERT INTO growing_guides (
        id, public_id, guide_key, version, title, biological_entity_id,
        climate_context, technique_context, region_context, status, summary
      ) VALUES (
        ${ids.guideRhs},
        ${echinopsisGuide.publicId},
        ${echinopsisGuide.guideKey},
        ${echinopsisGuide.version},
        ${echinopsisGuide.title},
        ${ids.biologicalEntity},
        ${echinopsisGuide.climateContext ?? null},
        ${echinopsisGuide.techniqueContext ?? null},
        ${echinopsisGuide.regionContext ?? null},
        ${echinopsisGuide.status},
        ${echinopsisGuide.summary ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        guide_key = EXCLUDED.guide_key,
        version = EXCLUDED.version,
        title = EXCLUDED.title,
        biological_entity_id = EXCLUDED.biological_entity_id,
        climate_context = EXCLUDED.climate_context,
        technique_context = EXCLUDED.technique_context,
        region_context = EXCLUDED.region_context,
        status = EXCLUDED.status,
        summary = EXCLUDED.summary
    `;

    for (const [
      id,
      sectionKey,
      statement,
      evidenceLevel,
      assertionType,
      sourceId,
    ] of editorialGuideClaims("guide-echinopsis-pachanoi-general-cacti-v1")) {
      await transaction`
        INSERT INTO growing_guide_claims (
          id, growing_guide_id, section_key, statement, evidence_level,
          source_id, assertion_type
        ) VALUES (
          ${id}, ${ids.guideRhs}, ${sectionKey}, ${statement}, ${evidenceLevel},
          ${sourceId}, ${assertionType}
        )
        ON CONFLICT (id) DO UPDATE SET
          growing_guide_id = EXCLUDED.growing_guide_id,
          section_key = EXCLUDED.section_key,
          statement = EXCLUDED.statement,
          evidence_level = EXCLUDED.evidence_level,
          source_id = EXCLUDED.source_id,
          assertion_type = EXCLUDED.assertion_type
      `;
    }

    for (const [guideId, coverage] of guideCoverageById) {
      await transaction`
        UPDATE growing_guides
        SET coverage = ${json(coverage)}
        WHERE id = ${guideId}
      `;
    }

    await transaction`
      INSERT INTO communities (
        id, public_id, name, description, visibility
      ) VALUES (
        ${ids.communityDemo},
        'community-demo-pending-review',
        'Contexto comunitario demo · pendiente de revisión',
        'Registro sintético para probar el flujo editorial; no representa una comunidad real ni atribuye conocimiento tradicional.',
        'restricted'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        visibility = EXCLUDED.visibility
    `;

    await transaction`
      INSERT INTO communities (
        id, public_id, name, description, visibility
      ) VALUES (
        ${ids.communitySaraguro},
        'community-saraguro-ecuador-source-scoped',
        'Comunidad Saraguro · registro acotado a fuente',
        'Registro de contexto para el estudio de Armijos, Cota y González. No es una representación comunitaria autorizada ni una atribución directa de voz; requiere revisión y consentimiento antes de cualquier publicación.',
        'restricted'
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        visibility = EXCLUDED.visibility
    `;

    await transaction`
      INSERT INTO places (
        id, public_id, name, place_type, country_code,
        geometry_public, geometry_exact, visibility, description, source_id
      ) VALUES (
        ${ids.placeSaraguro},
        'place-saraguro-southern-ecuador',
        'Saraguro · sur de Ecuador',
        'source-scoped-cultural-context',
        'EC',
        NULL,
        NULL,
        'restricted',
        'Lugar de contexto indicado por la publicación; se omiten coordenadas porque la relación cultural está restringida y no se necesita precisión geográfica para la afirmación.',
        ${ids.sourceSaraguro}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        name = EXCLUDED.name,
        place_type = EXCLUDED.place_type,
        country_code = EXCLUDED.country_code,
        geometry_public = EXCLUDED.geometry_public,
        geometry_exact = EXCLUDED.geometry_exact,
        visibility = EXCLUDED.visibility,
        description = EXCLUDED.description,
        source_id = EXCLUDED.source_id
    `;

    for (const relation of editorialContent.cultures.flatMap(
      (document) => document.relations,
    )) {
      if (!includeSyntheticDemoData && relation.reviewStatus === "draft") {
        await transaction`
          DELETE FROM record_provenance
          WHERE cultural_relation_id = (
            SELECT id FROM cultural_relations
            WHERE public_id = ${relation.publicId}
          )
        `;
        await transaction`
          DELETE FROM cultural_relations
          WHERE public_id = ${relation.publicId}
        `;
        continue;
      }
      const [subject] = await transaction<
        { entity_id: string | null; taxon_id: string | null }[]
      >`
        SELECT
          biological_entity.id AS entity_id,
          taxon.id AS taxon_id
        FROM (SELECT 1) AS seed
        LEFT JOIN biological_entities AS biological_entity
          ON biological_entity.public_id = ${relation.subjectPublicId}
        LEFT JOIN taxa AS taxon
          ON taxon.public_id = ${relation.subjectPublicId}
        LIMIT 1
      `;
      const [community] = relation.communityPublicId
        ? await transaction<{ id: string }[]>`
            SELECT id FROM communities
            WHERE public_id = ${relation.communityPublicId}
            LIMIT 1
          `
        : [];
      const [culture] = relation.culturePublicId
        ? await transaction<{ id: string }[]>`
            SELECT id FROM cultures
            WHERE public_id = ${relation.culturePublicId}
            LIMIT 1
          `
        : [];
      const [place] = relation.placePublicId
        ? await transaction<{ id: string }[]>`
            SELECT id FROM places
            WHERE public_id = ${relation.placePublicId}
            LIMIT 1
          `
        : [];
      const [period] = relation.historicalPeriodPublicId
        ? await transaction<{ id: string }[]>`
            SELECT id FROM historical_periods
            WHERE public_id = ${relation.historicalPeriodPublicId}
            LIMIT 1
          `
        : [];
      const [agent] = await transaction<{ id: string }[]>`
        SELECT id FROM agents
        WHERE public_id = ${relation.documentedByAgentPublicId}
        LIMIT 1
      `;
      const [source] = await transaction<{ id: string }[]>`
        SELECT id FROM sources
        WHERE public_id = ${relation.sourcePublicId}
        LIMIT 1
      `;

      if (!subject || (!subject.entity_id && !subject.taxon_id)) {
        throw new Error(
          `Editorial relation ${relation.publicId} has no seeded taxon or biological entity subject`,
        );
      }
      if (!community && !culture) {
        throw new Error(
          `Editorial relation ${relation.publicId} has no seeded community or culture context`,
        );
      }
      if (!agent || !source) {
        throw new Error(
          `Editorial relation ${relation.publicId} has no seeded documenting agent or source`,
        );
      }
      await transaction`
        INSERT INTO cultural_relations (
          id, public_id, relation_type, taxon_id, biological_entity_id,
          culture_id, community_id, place_id, historical_period_id,
          documented_by_agent_id, source_id, value_text, description,
          evidence_level, assertion_type, author_perspective, sensitivity,
          access_level, license_uri, review_notes, review_status, recorded_on
        ) VALUES (
          ${editorialCulturalRelationIdByPublicId.get(relation.publicId) ?? deterministicUuid(`editorial-cultural-relation:${relation.publicId}`)},
          ${relation.publicId},
          ${relation.relationType},
          ${subject.taxon_id},
          ${subject.entity_id},
          ${culture?.id ?? null},
          ${community?.id ?? null},
          ${place?.id ?? null},
          ${period?.id ?? null},
          ${agent.id},
          ${source.id},
          ${relation.valueText ?? null},
          ${relation.description},
          ${relation.evidenceLevel},
          ${relation.assertionType},
          ${relation.authorPerspective},
          ${relation.sensitivity},
          ${relation.accessLevel},
          ${relation.license},
          ${relation.reviewNote},
          ${relation.reviewStatus},
          ${relation.recordedOn ?? null}
        )
        ON CONFLICT (public_id) DO UPDATE SET
          relation_type = EXCLUDED.relation_type,
          taxon_id = EXCLUDED.taxon_id,
          biological_entity_id = EXCLUDED.biological_entity_id,
          culture_id = EXCLUDED.culture_id,
          community_id = EXCLUDED.community_id,
          place_id = EXCLUDED.place_id,
          historical_period_id = EXCLUDED.historical_period_id,
          documented_by_agent_id = EXCLUDED.documented_by_agent_id,
          source_id = EXCLUDED.source_id,
          value_text = EXCLUDED.value_text,
          description = EXCLUDED.description,
          evidence_level = EXCLUDED.evidence_level,
          assertion_type = EXCLUDED.assertion_type,
          author_perspective = EXCLUDED.author_perspective,
          sensitivity = EXCLUDED.sensitivity,
          access_level = EXCLUDED.access_level,
          license_uri = EXCLUDED.license_uri,
          review_notes = EXCLUDED.review_notes,
          review_status = EXCLUDED.review_status,
          recorded_on = EXCLUDED.recorded_on
      `;
    }

    for (const relation of editorialContent.cultures.flatMap(
      (document) => document.relations,
    )) {
      await transaction`
        UPDATE cultural_relations
        SET relation_type = ${relation.relationType},
            value_text = ${relation.valueText ?? null},
            description = ${relation.description},
            evidence_level = ${relation.evidenceLevel},
            assertion_type = ${relation.assertionType},
            author_perspective = ${relation.authorPerspective},
            sensitivity = ${relation.sensitivity},
            access_level = ${relation.accessLevel},
            license_uri = ${relation.license},
            review_notes = ${relation.reviewNote},
            review_status = ${relation.reviewStatus},
            recorded_on = ${relation.recordedOn ?? null}
        WHERE public_id = ${relation.publicId}
      `;
    }

    await transaction`
      INSERT INTO record_provenance (
        source_record_id, cultural_relation_id, assertion_type
      ) VALUES (
        ${ids.sourceRecordSaraguro},
        (
          SELECT id
          FROM cultural_relations
          WHERE public_id = 'cultural-relation-san-pedro-saraguro-2014'
        ),
        'academic_publication'
      )
      ON CONFLICT DO NOTHING
    `;

    await transaction`
      INSERT INTO locations (
        id, public_id, name, location_type, geometry_public, geometry_exact,
        visibility, notes
      ) VALUES (
        ${ids.locationPublic},
        'location-demo-public',
        'Jardín demo · área aproximada',
        'garden',
        ST_SetSRID(ST_GeomFromText('POINT(-70.65 -33.45)'), 4326),
        ST_SetSRID(ST_GeomFromText('POINT(-70.650123 -33.450456)'), 4326),
        ${demoVisibility},
        'Coordenada sintética y aproximada; no representa una ubicación privada real.'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        location_type = EXCLUDED.location_type,
        geometry_public = EXCLUDED.geometry_public,
        geometry_exact = EXCLUDED.geometry_exact,
        visibility = EXCLUDED.visibility,
        notes = EXCLUDED.notes,
        updated_at = now()
    `;

    await transaction`
      UPDATE specimen_locations
      SET is_current = false, ends_at = COALESCE(ends_at, now())
      WHERE specimen_id = ${ids.specimenPublic} AND is_current = true
    `;

    await transaction`
      INSERT INTO places (
        id, public_id, name, place_type, country_code,
        geometry_public, geometry_exact, visibility, description, source_id
      ) VALUES (
        ${ids.placePublic},
        'place-demo-public',
        'Jardín demo · región aproximada',
        'synthetic-demo',
        'CL',
        ST_SetSRID(ST_GeomFromText('POINT(-70.65 -33.45)'), 4326),
        ST_SetSRID(ST_GeomFromText('POINT(-70.650123 -33.450456)'), 4326),
        ${demoVisibility},
        'Lugar sintético para validar el mapa público y la redacción geográfica.',
        ${ids.source}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        place_type = EXCLUDED.place_type,
        country_code = EXCLUDED.country_code,
        geometry_public = EXCLUDED.geometry_public,
        geometry_exact = EXCLUDED.geometry_exact,
        visibility = EXCLUDED.visibility,
        description = EXCLUDED.description,
        source_id = EXCLUDED.source_id
    `;

    await transaction`
      INSERT INTO observations (
        id, public_id, specimen_id, place_id, observed_at,
        observation_basis, geometry_public, geometry_exact, environment,
        notes, visibility, protocol_id, uncertainty
      ) VALUES (
        ${ids.observationPublic},
        'observation-demo-public-01',
        ${ids.specimenPublic},
        ${ids.placePublic},
        '2026-01-15T12:00:00Z',
        'human',
        ST_SetSRID(ST_GeomFromText('POINT(-70.65 -33.45)'), 4326),
        ST_SetSRID(ST_GeomFromText('POINT(-70.650123 -33.450456)'), 4326),
        ${json({ synthetic: true, context: "fixture-demo" })},
        'Observación sintética para probar distribución y procedencia; no es una observación de campo.',
        ${demoVisibility},
        ${ids.protocolDemo},
        ${json({ synthetic: true, coordinate: "rounded" })}
      )
      ON CONFLICT (id) DO UPDATE SET
        specimen_id = EXCLUDED.specimen_id,
        place_id = EXCLUDED.place_id,
        observed_at = EXCLUDED.observed_at,
        observation_basis = EXCLUDED.observation_basis,
        geometry_public = EXCLUDED.geometry_public,
        geometry_exact = EXCLUDED.geometry_exact,
        environment = EXCLUDED.environment,
        notes = EXCLUDED.notes,
        protocol_id = EXCLUDED.protocol_id,
        uncertainty = EXCLUDED.uncertainty,
        visibility = EXCLUDED.visibility
    `;

    await transaction`
      INSERT INTO media_attachments (media_id, biological_entity_id, sort_order)
      VALUES (${ids.media}, ${ids.biologicalEntity}, 0)
      ON CONFLICT (media_id, sort_order) DO UPDATE SET
        biological_entity_id = EXCLUDED.biological_entity_id
    `;

    await transaction`
      INSERT INTO claims (
        id, public_id, subject_type, subject_id, predicate, object_text,
        assertion_type, evidence_level, author_agent_id, source_id,
        author_perspective, recorded_on, visibility, license_uri, review_status
      ) VALUES (
        ${ids.claimDemo},
        'claim-demo-taxonomy-01',
        'biological_entity',
        ${ids.biologicalEntity},
        'hasScientificName',
        'Echinopsis pachanoi',
        'taxonomic_fact',
        'documented',
        ${ids.agentDemo},
        ${ids.source},
        'WACHUMA demo editorial record',
        '2026-08-21',
        ${demoVisibility},
        'WACHUMA-PROJECT',
        'draft'
      )
      ON CONFLICT (id) DO UPDATE SET
        subject_type = EXCLUDED.subject_type,
        subject_id = EXCLUDED.subject_id,
        predicate = EXCLUDED.predicate,
        object_text = EXCLUDED.object_text,
        assertion_type = EXCLUDED.assertion_type,
        evidence_level = EXCLUDED.evidence_level,
        author_agent_id = EXCLUDED.author_agent_id,
        source_id = EXCLUDED.source_id,
        author_perspective = EXCLUDED.author_perspective,
        recorded_on = EXCLUDED.recorded_on,
        visibility = EXCLUDED.visibility,
        license_uri = EXCLUDED.license_uri,
        review_status = EXCLUDED.review_status,
        updated_at = now()
    `;

    await transaction`
      INSERT INTO claim_sources (claim_id, source_id, role)
      VALUES (${ids.claimDemo}, ${ids.source}, 'primary')
      ON CONFLICT (claim_id, source_id) DO UPDATE SET role = EXCLUDED.role
    `;

    await transaction`
      INSERT INTO claims (
        id, public_id, subject_type, subject_id, predicate, object_text,
        assertion_type, evidence_level, author_agent_id, source_id,
        author_perspective, recorded_on, visibility, license_uri, review_status
      ) VALUES (
        ${ids.claimEchinopsisHistory},
        'claim-echinopsis-pachanoi-historical-combination',
        'taxon',
        ${ids.taxon},
        'historicalContext',
        'WACHUMA conserva Trichocereus pachanoi como combinación taxonómica histórica relacionada con la ficha de Echinopsis pachanoi; no la utiliza para resolver nombres culturales ni como equivalencia taxonómica absoluta.',
        'editorial_interpretation',
        'documented',
        ${ids.agentDemo},
        ${ids.sourceGbif},
        'Interpretación editorial de WACHUMA basada en la coincidencia taxonómica de GBIF Backbone; la perspectiva se conserva separada del proveedor.',
        '2026-08-23',
        'public',
        'CC BY 4.0',
        'accepted'
      )
      ON CONFLICT (id) DO UPDATE SET
        subject_type = EXCLUDED.subject_type,
        subject_id = EXCLUDED.subject_id,
        predicate = EXCLUDED.predicate,
        object_text = EXCLUDED.object_text,
        assertion_type = EXCLUDED.assertion_type,
        evidence_level = EXCLUDED.evidence_level,
        author_agent_id = EXCLUDED.author_agent_id,
        source_id = EXCLUDED.source_id,
        author_perspective = EXCLUDED.author_perspective,
        recorded_on = EXCLUDED.recorded_on,
        visibility = EXCLUDED.visibility,
        license_uri = EXCLUDED.license_uri,
        review_status = EXCLUDED.review_status,
        updated_at = now()
    `;

    await transaction`
      INSERT INTO claim_sources (claim_id, source_id, role)
      VALUES (${ids.claimEchinopsisHistory}, ${ids.sourceGbif}, 'primary')
      ON CONFLICT (claim_id, source_id) DO UPDATE SET role = EXCLUDED.role
    `;

    await transaction`
      INSERT INTO trait_measurements (
        id, public_id, trait_definition_id, specimen_id, value_numeric,
        unit, measured_at, method, uncertainty, protocol_id, source_id,
        visibility
      ) VALUES (
        ${ids.traitMeasurementHeight},
        'trait-measurement-demo-01',
        ${ids.traitDefinitionHeight},
        ${ids.specimenPublic},
        42,
        'cm',
        '2026-01-15T12:00:00Z',
        'synthetic fixture measurement',
        ${json({ synthetic: true })},
        ${ids.protocolDemo},
        ${ids.source},
        ${demoVisibility}
      )
      ON CONFLICT (id) DO UPDATE SET
        trait_definition_id = EXCLUDED.trait_definition_id,
        specimen_id = EXCLUDED.specimen_id,
        value_numeric = EXCLUDED.value_numeric,
        unit = EXCLUDED.unit,
        measured_at = EXCLUDED.measured_at,
        method = EXCLUDED.method,
        uncertainty = EXCLUDED.uncertainty,
        protocol_id = EXCLUDED.protocol_id,
        source_id = EXCLUDED.source_id,
        visibility = EXCLUDED.visibility
    `;

    for (const [id, publicId, relationshipType, parentId, childId] of [
      [
        ids.lineageCutting,
        "lineage-demo-cutting-01",
        "cutting_of",
        ids.specimenPublic,
        ids.specimenPublicChildOne,
      ],
      [
        ids.lineageClone,
        "lineage-demo-clone-01",
        "clone_of",
        ids.specimenPublicChildOne,
        ids.specimenPublicChildTwo,
      ],
    ] as const) {
      await transaction`
        INSERT INTO lineage_relationships (
          id, relationship_type, parent_specimen_id, child_specimen_id,
          occurred_at, source_id, notes
        ) VALUES (
          ${id}, ${relationshipType}, ${parentId}, ${childId},
          '2026-01-20T12:00:00Z', ${ids.source},
          'Relación sintética para probar el árbol público; no describe material real.'
        )
        ON CONFLICT (id) DO UPDATE SET
          relationship_type = EXCLUDED.relationship_type,
          parent_specimen_id = EXCLUDED.parent_specimen_id,
          child_specimen_id = EXCLUDED.child_specimen_id,
          occurred_at = EXCLUDED.occurred_at,
          source_id = EXCLUDED.source_id,
        notes = EXCLUDED.notes
      `;
    }

    await transaction`
      INSERT INTO record_provenance (
        source_record_id, lineage_relationship_id, source_id, assertion_type
      ) VALUES
        (${ids.sourceRecordLineageDemo}, ${ids.lineageCutting}, ${ids.source}, 'editorial_interpretation'),
        (${ids.sourceRecordLineageDemo}, ${ids.lineageClone}, ${ids.source}, 'editorial_interpretation')
      ON CONFLICT DO NOTHING
    `;

    await transaction`
      INSERT INTO derivation_events (
        id, public_id, event_type, method, occurred_at, source_id,
        notes, visibility
      ) VALUES (
        ${ids.derivationEventDemo},
        'derivation-demo-cutting-01',
        'cutting',
        'synthetic demo derivation',
        '2026-01-20T12:00:00Z',
        ${ids.source},
        'Fixture sintético; no representa material real.',
        ${demoVisibility}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        event_type = EXCLUDED.event_type,
        method = EXCLUDED.method,
        occurred_at = EXCLUDED.occurred_at,
        source_id = EXCLUDED.source_id,
        notes = EXCLUDED.notes,
        visibility = EXCLUDED.visibility
    `;

    for (const [id, direction, specimenId, label] of [
      [
        ids.derivationMaterialInput,
        "input",
        ids.specimenPublic,
        "planta madre demo",
      ],
      [
        ids.derivationMaterialOutput,
        "output",
        ids.specimenPublicChildOne,
        "esqueje demo",
      ],
    ] as const) {
      await transaction`
        INSERT INTO derivation_event_materials (
          id, derivation_event_id, direction, specimen_id, label, notes
        ) VALUES (
          ${id},
          ${ids.derivationEventDemo},
          ${direction},
          ${specimenId},
          ${label},
          'Material sintético de prueba.'
        )
        ON CONFLICT (id) DO UPDATE SET
          derivation_event_id = EXCLUDED.derivation_event_id,
          direction = EXCLUDED.direction,
          specimen_id = EXCLUDED.specimen_id,
          label = EXCLUDED.label,
          notes = EXCLUDED.notes
      `;
    }

    await transaction`
      INSERT INTO cultivation_events (
        id, specimen_id, location_id, event_type, occurred_at, notes,
        measurements, source_id
      ) VALUES (
        ${ids.eventPublic},
        ${ids.specimenPublic},
        ${ids.locationPublic},
        'observation',
        '2026-01-21T12:00:00Z',
        'Evento sintético de demostración; no es una recomendación de cultivo.',
        ${json({ synthetic: true })},
        ${ids.source}
      )
      ON CONFLICT (id) DO UPDATE SET
        specimen_id = EXCLUDED.specimen_id,
        location_id = EXCLUDED.location_id,
        event_type = EXCLUDED.event_type,
        occurred_at = EXCLUDED.occurred_at,
        notes = EXCLUDED.notes,
        measurements = EXCLUDED.measurements,
        source_id = EXCLUDED.source_id
    `;

    await transaction`
      INSERT INTO generator_versions (
        id, algorithm_key, version, runtime, repository_url, license_uri, attribution
      ) VALUES (
        ${ids.generatorVersion},
        ${recipe.algorithm},
        ${recipe.algorithmVersion},
        'typescript',
        'https://github.com/ligereza/WACHUMA',
        'MIT',
        'Generador parametric-cactus propio de WACHUMA'
      )
      ON CONFLICT (id) DO UPDATE SET
        algorithm_key = EXCLUDED.algorithm_key,
        version = EXCLUDED.version,
        runtime = EXCLUDED.runtime,
        repository_url = EXCLUDED.repository_url,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution
    `;

    await transaction`
      INSERT INTO garden_scenes (
        id, public_id, name, description, coordinate_system, units,
        visibility, current_version, default_seed
      ) VALUES (
        ${ids.scene},
        ${fixture.scene.publicId},
        ${fixture.scene.name},
        ${fixture.scene.description ?? null},
        ${fixture.scene.coordinateSystem},
        ${fixture.scene.units},
        ${demoVisibility},
        ${fixture.scene.version},
        ${fixture.scene.defaultSeed ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        coordinate_system = EXCLUDED.coordinate_system,
        units = EXCLUDED.units,
        visibility = EXCLUDED.visibility,
        current_version = EXCLUDED.current_version,
        default_seed = EXCLUDED.default_seed,
        updated_at = now()
    `;

    await transaction`
      INSERT INTO scene_assets (
        id, public_id, media_id, format, origin, content_hash, title,
        source_id, generator_version_id, visibility, metadata
      ) VALUES (
        ${ids.asset},
        ${asset.publicId},
        ${ids.media},
        ${asset.format},
        ${asset.origin},
        ${asset.contentHash},
        ${asset.title ?? null},
        ${ids.source},
        ${ids.generatorVersion},
        ${demoVisibility},
        ${json(asset.metadata)}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        media_id = EXCLUDED.media_id,
        format = EXCLUDED.format,
        origin = EXCLUDED.origin,
        content_hash = EXCLUDED.content_hash,
        title = EXCLUDED.title,
        source_id = EXCLUDED.source_id,
        generator_version_id = EXCLUDED.generator_version_id,
        visibility = EXCLUDED.visibility,
        metadata = EXCLUDED.metadata
    `;

    await transaction`
      INSERT INTO scene_asset_provenance (
        id, scene_asset_id, source_id, assertion_type, license_uri, attribution,
        retrieved_at, notes
      ) VALUES (
        ${ids.assetProvenance},
        ${ids.asset},
        ${ids.source},
        'editorial_interpretation',
        ${asset.license},
        ${asset.attribution},
        now(),
        'Representación procedural; no es una reconstrucción taxonómica ni una captura de un ejemplar real.'
      )
      ON CONFLICT (id) DO UPDATE SET
        scene_asset_id = EXCLUDED.scene_asset_id,
        source_id = EXCLUDED.source_id,
        assertion_type = EXCLUDED.assertion_type,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution,
        retrieved_at = EXCLUDED.retrieved_at,
        notes = EXCLUDED.notes
    `;

    await transaction`
      INSERT INTO garden_scene_assets (scene_id, scene_asset_id, visibility)
      VALUES (${ids.scene}, ${ids.asset}, ${demoVisibility})
      ON CONFLICT (scene_id, scene_asset_id) DO UPDATE SET
        visibility = EXCLUDED.visibility
    `;

    await transaction`
      INSERT INTO procedural_recipes (
        id, public_id, algorithm_key, algorithm_version, seed, parameters,
        constraints, target_biological_entity_id, generated_asset_id, status, visibility
      ) VALUES (
        ${ids.recipe},
        ${recipe.publicId},
        ${recipe.algorithm},
        ${recipe.algorithmVersion},
        ${recipe.seed},
        ${json(recipe.parameters)},
        ${json(recipe.constraints)},
        ${ids.biologicalEntity},
        ${ids.asset},
        ${recipe.status},
        ${includeSyntheticDemoData ? recipe.visibility : "restricted"}
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        algorithm_key = EXCLUDED.algorithm_key,
        algorithm_version = EXCLUDED.algorithm_version,
        seed = EXCLUDED.seed,
        parameters = EXCLUDED.parameters,
        constraints = EXCLUDED.constraints,
        target_biological_entity_id = EXCLUDED.target_biological_entity_id,
        generated_asset_id = EXCLUDED.generated_asset_id,
        status = EXCLUDED.status,
        visibility = EXCLUDED.visibility,
        updated_at = now()
    `;

    await transaction`
      DELETE FROM scene_objects
      WHERE scene_id = ${ids.scene}
        AND public_id IN ('scene-object-private-specimen-01', 'scene-object-private-specimen-02')
    `;

    for (const [index, object] of fixture.objects.entries()) {
      const objectId = index === 0 ? ids.objectOne : ids.objectTwo;
      const specimenId =
        object.specimenId === "specimen-demo-01"
          ? ids.specimenOne
          : ids.specimenTwo;
      await transaction`
        INSERT INTO scene_objects (
          id, public_id, scene_id, object_type, label, specimen_id,
          scene_asset_id, transform, representation_type, visibility, metadata
        ) VALUES (
          ${objectId},
          ${object.publicId},
          ${ids.scene},
          ${object.objectType},
          ${object.label},
          ${specimenId},
          ${ids.asset},
          ${json(object.transform)},
          ${object.representationType},
          ${object.visibility},
          ${json(object.metadata)}
        )
        ON CONFLICT (id) DO UPDATE SET
          public_id = EXCLUDED.public_id,
          scene_id = EXCLUDED.scene_id,
          object_type = EXCLUDED.object_type,
          label = EXCLUDED.label,
          specimen_id = EXCLUDED.specimen_id,
          scene_asset_id = EXCLUDED.scene_asset_id,
          transform = EXCLUDED.transform,
          representation_type = EXCLUDED.representation_type,
          visibility = EXCLUDED.visibility,
          metadata = EXCLUDED.metadata
      `;
    }

    await transaction`
      INSERT INTO scene_snapshots (scene_id, version, content_hash, scene_payload)
      VALUES (
        ${ids.scene},
        ${fixture.scene.version},
        ${snapshotHash},
        ${json(fixture)}
      )
      ON CONFLICT (scene_id, version) DO UPDATE SET
        content_hash = EXCLUDED.content_hash,
        scene_payload = EXCLUDED.scene_payload
    `;

    for (const fixtureSeed of materialFixtureSeeds) {
      const materialFixtureId = deterministicUuid(
        `material-fixture:${fixtureSeed.publicId}`,
      );
      const [fixtureEntity] = await transaction<{ visibility: string }[]>`
        SELECT visibility
        FROM biological_entities
        WHERE id = ${fixtureSeed.biologicalEntityId}
        LIMIT 1
      `;
      const materialVisibility =
        fixtureEntity?.visibility === "public" ? "public" : "restricted";
      await transaction`
        INSERT INTO material_fixtures (
          id, public_id, biological_entity_id, representation_type,
          growth_stage, material, interpretation, visibility
        ) VALUES (
          ${materialFixtureId},
          ${fixtureSeed.publicId},
          ${fixtureSeed.biologicalEntityId},
          'procedural-interpretation',
          ${fixtureSeed.growthStage},
          ${json(fixtureSeed.material)},
          ${json({
            label: "material-interpretation",
            scientificReconstruction: false,
            notes: fixtureSeed.notes,
          })},
          ${materialVisibility}
        )
        ON CONFLICT (id) DO UPDATE SET
          public_id = EXCLUDED.public_id,
          biological_entity_id = EXCLUDED.biological_entity_id,
          representation_type = EXCLUDED.representation_type,
          growth_stage = EXCLUDED.growth_stage,
          material = EXCLUDED.material,
          interpretation = EXCLUDED.interpretation,
          visibility = EXCLUDED.visibility,
          updated_at = now()
      `;

      await transaction`
        DELETE FROM material_fixture_binding_claims
        WHERE binding_id IN (
          SELECT id FROM material_fixture_bindings
          WHERE material_fixture_id = ${materialFixtureId}
        )
      `;
      await transaction`
        DELETE FROM material_fixture_binding_sources
        WHERE binding_id IN (
          SELECT id FROM material_fixture_bindings
          WHERE material_fixture_id = ${materialFixtureId}
        )
      `;
      await transaction`
        DELETE FROM material_fixture_bindings
        WHERE material_fixture_id = ${materialFixtureId}
      `;

      for (const bindingSeed of fixtureSeed.bindings) {
        const bindingId = deterministicUuid(
          `material-binding:${bindingSeed.publicId}`,
        );
        await transaction`
          INSERT INTO material_fixture_bindings (
            id, public_id, material_fixture_id, layer, target,
            interpretation, notes
          ) VALUES (
            ${bindingId},
            ${bindingSeed.publicId},
            ${materialFixtureId},
            ${bindingSeed.layer},
            ${bindingSeed.target},
            ${bindingSeed.interpretation},
            ${bindingSeed.notes}
          )
          ON CONFLICT (id) DO UPDATE SET
            public_id = EXCLUDED.public_id,
            material_fixture_id = EXCLUDED.material_fixture_id,
            layer = EXCLUDED.layer,
            target = EXCLUDED.target,
            interpretation = EXCLUDED.interpretation,
            notes = EXCLUDED.notes
        `;
        await transaction`
          INSERT INTO material_fixture_binding_sources (binding_id, source_id)
          VALUES (${bindingId}, ${materialFixtureSourceId})
          ON CONFLICT (binding_id, source_id) DO NOTHING
        `;
      }
    }

    // A restricted taxon is not part of the public projection, even when an
    // imported observation or media row was previously accepted on its own.
    // Keep those source records for provenance, but demote their public
    // projection whenever the editorial entity is outside the monograph.
    await transaction`
      UPDATE observations AS observation
      SET visibility = 'restricted'
      WHERE observation.biological_entity_id IN (
        SELECT entity.id
        FROM biological_entities AS entity
        WHERE entity.visibility <> 'public'
      )
      OR observation.taxon_id IN (
        SELECT entity.taxon_id
        FROM biological_entities AS entity
        WHERE entity.visibility <> 'public'
      )
    `;
    await transaction`
      UPDATE media AS media
      SET visibility = 'restricted'
      WHERE media.id IN (
        SELECT attachment.media_id
        FROM media_attachments AS attachment
        LEFT JOIN observations AS observation
          ON observation.id = attachment.observation_id
        LEFT JOIN biological_entities AS entity
          ON entity.id = attachment.biological_entity_id
        LEFT JOIN taxa AS taxon
          ON taxon.id = attachment.taxon_id
        WHERE entity.visibility <> 'public'
           OR taxon.id IN (
             SELECT restricted_entity.taxon_id
             FROM biological_entities AS restricted_entity
             WHERE restricted_entity.visibility <> 'public'
           )
           OR observation.biological_entity_id IN (
             SELECT restricted_entity.id
             FROM biological_entities AS restricted_entity
             WHERE restricted_entity.visibility <> 'public'
           )
           OR observation.taxon_id IN (
             SELECT restricted_entity.taxon_id
             FROM biological_entities AS restricted_entity
             WHERE restricted_entity.visibility <> 'public'
           )
      )
    `;
  });

  console.log(`Seeded ${fixture.scene.publicId} with GLB ${modelHash}.`);
} finally {
  await sql.end();
}
