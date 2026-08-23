import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import postgres from "postgres";

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
  culturalRelationDemo: "00000000-0000-4000-8000-000000000128",
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
} as const;

const rootDirectory = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
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
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed WACHUMA.");
}

const sql = postgres(databaseUrl);

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
        'Taxon de demostración; la representación 3D no constituye una reconstrucción científica.'
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
        'Caso de prueba del modelo; no equipara nombres culturales con el taxón.',
        'public'
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        taxon_id = EXCLUDED.taxon_id,
        authority_note = EXCLUDED.authority_note,
        visibility = EXCLUDED.visibility,
        updated_at = now()
    `;

    for (const [id, publicId, visibility] of [
      [ids.specimenOne, "specimen-demo-01", "restricted"],
      [ids.specimenTwo, "specimen-demo-02", "restricted"],
      [ids.specimenPublic, "specimen-public-demo-01", "public"],
      [ids.specimenPublicChildOne, "specimen-public-child-01", "public"],
      [ids.specimenPublicChildTwo, "specimen-public-child-02", "public"],
    ] as const) {
      await transaction`
        INSERT INTO specimens (
          id, public_id, specimen_type, biological_entity_id, status, visibility, notes
        ) VALUES (
          ${id},
          ${publicId},
          'plant-live',
          ${ids.biologicalEntity},
          'alive',
          ${visibility},
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
        'public'
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
        id, public_id, source_type, title, citation, url, license_uri, attribution
      ) VALUES (
        ${ids.source},
        'source-wachuma-demo-editorial',
        'editorial',
        'WACHUMA · generador procedural de demostración',
        'Repositorio WACHUMA, receta parametric-cactus 0.1.0',
        'https://github.com/ligereza/WACHUMA',
        'WACHUMA-PROJECT',
        'WACHUMA'
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        source_type = EXCLUDED.source_type,
        title = EXCLUDED.title,
        citation = EXCLUDED.citation,
        url = EXCLUDED.url,
        license_uri = EXCLUDED.license_uri,
        attribution = EXCLUDED.attribution
      `;

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
        'public',
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

    await transaction`
      INSERT INTO growing_guides (
        id, public_id, guide_key, version, title, biological_entity_id,
        climate_context, technique_context, region_context, status, summary
      ) VALUES (
        ${ids.guide},
        'guide-echinopsis-pachanoi-demo-v1',
        'echinopsis-pachanoi-demo',
        1,
        'Guía de demostración · Echinopsis pachanoi',
        ${ids.biologicalEntity},
        'Pendiente de definir con fuentes y región',
        'Documento estructurado de prueba',
        'No especificada',
        'published',
        'Documento público de demostración del esquema. No presenta recomendaciones de cultivo sin bibliografía verificable.'
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

    for (const [id, sectionKey, statement, evidenceLevel, assertionType] of [
      [
        ids.guideClaimPropagation,
        "propagation",
        "Pendiente de documentar métodos de propagación con una fuente verificable y contexto regional.",
        "unverified",
        "editorial_interpretation",
      ],
      [
        ids.guideClaimSubstrate,
        "substrate",
        "Pendiente de documentar sustrato, drenaje y condiciones de cultivo; no es una recomendación publicada.",
        "unverified",
        "editorial_interpretation",
      ],
      [
        ids.guideClaimObservation,
        "observations",
        "Registrar aquí observaciones contemporáneas fechadas del jardín, separadas de la bibliografía.",
        "reported",
        "contemporary_observation",
      ],
    ] as const) {
      await transaction`
        INSERT INTO growing_guide_claims (
          id, growing_guide_id, section_key, statement, evidence_level,
          source_id, assertion_type
        ) VALUES (
          ${id}, ${ids.guide}, ${sectionKey}, ${statement}, ${evidenceLevel},
          ${ids.source}, ${assertionType}
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
      INSERT INTO cultural_relations (
        id, public_id, relation_type, biological_entity_id, community_id,
        historical_period_id, documented_by_agent_id, source_id, value_text,
        description, evidence_level, assertion_type, author_perspective,
        sensitivity, access_level, license_uri, review_notes, review_status,
        recorded_on
      ) VALUES (
        ${ids.culturalRelationDemo},
        'cultural-relation-wachuma-demo',
        'vernacular_name',
        ${ids.biologicalEntity},
        ${ids.communityDemo},
        ${ids.historicalPeriodDemo},
        ${ids.agentDemo},
        ${ids.source},
        'wachuma / huachuma / San Pedro',
        'Registro sintético para probar que un nombre cultural debe mantenerse contextualizado y no convertirse automáticamente en sinónimo taxonómico.',
        'unverified',
        'editorial_interpretation',
        'Fixture editorial de prueba; no atribuye una afirmación a una comunidad real.',
        'sensitive',
        'restricted',
        'WACHUMA-PROJECT',
        'No publicar: requiere revisión de procedencia, contexto y consentimiento.',
        'under-review',
        '2026-08-21'
      )
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        relation_type = EXCLUDED.relation_type,
        biological_entity_id = EXCLUDED.biological_entity_id,
        community_id = EXCLUDED.community_id,
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
        'public',
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
        'public',
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
        'public',
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
        'public',
        'WACHUMA-PROJECT',
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
      VALUES (${ids.claimDemo}, ${ids.source}, 'primary')
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
        'public'
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
        'public'
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
        'public',
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
        'public',
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
      VALUES (${ids.scene}, ${ids.asset}, 'public')
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
        ${recipe.visibility}
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
  });

  console.log(`Seeded ${fixture.scene.publicId} with GLB ${modelHash}.`);
} finally {
  await sql.end();
}
