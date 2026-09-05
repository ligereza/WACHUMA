import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "../packages/db/node_modules/postgres/src/index.js";
import {
  buildDarwinCoreFiles,
  buildRoCrateMetadata,
  buildZip,
  claimToJsonLd,
} from "../packages/interop/dist/index.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const databaseUrl = process.env.DATABASE_URL;
const outputDirectory = resolve(
  root,
  process.env.WACHUMA_PUBLIC_EXPORT_DIR ?? "dist/public-export",
);
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for export:public; this command never falls back to fixtures.",
  );
}

function asDate(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function unique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function requireSourceFields(row, label) {
  if (!row.sourceId || !row.license || !row.rightsHolder) {
    throw new Error(`${label} has no complete source/license/attribution`);
  }
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : Buffer.from(value))
    .digest("hex");
}

function canonicalJson(value) {
  return `${JSON.stringify(value)}\n`;
}

async function readPublicCorpus(sql) {
  const taxa = await sql.unsafe(`
    SELECT
      be.public_id AS id,
      t.public_id AS taxon_id,
      t.scientific_name,
      t.rank,
      t.taxonomic_status,
      COALESCE(ARRAY_AGG(DISTINCT refs.source_public_id)
        FILTER (WHERE refs.source_public_id IS NOT NULL), ARRAY[]::text[]) AS source_ids,
      COALESCE(string_agg(DISTINCT refs.license_uri, ' | ')
        FILTER (WHERE refs.license_uri IS NOT NULL), '') AS license,
      COALESCE(string_agg(DISTINCT refs.attribution, ' | ')
        FILTER (WHERE refs.attribution IS NOT NULL), '') AS rights_holder
    FROM biological_entities AS be
    JOIN taxa AS t ON t.id = be.taxon_id
    LEFT JOIN LATERAL (
      SELECT s.public_id AS source_public_id, s.license_uri, s.attribution
      FROM claims AS c
      JOIN sources AS s ON s.id = c.source_id
      WHERE c.visibility = 'public'
        AND c.review_status = 'accepted'
        AND (
          (c.subject_type = 'taxon' AND c.subject_id = t.id)
          OR (c.subject_type = 'biological_entity' AND c.subject_id = be.id)
        )
      UNION
      SELECT s.public_id, s.license_uri, s.attribution
      FROM record_provenance AS rp
      JOIN source_records AS sr ON sr.id = rp.source_record_id
      JOIN sources AS s ON s.id = rp.source_id
      WHERE sr.status = 'accepted'
        AND (rp.taxon_id = t.id OR rp.biological_entity_id = be.id)
    ) AS refs ON true
    WHERE be.visibility = 'public'
    GROUP BY be.public_id, t.public_id, t.scientific_name, t.rank, t.taxonomic_status
    HAVING COUNT(refs.source_public_id) > 0
    ORDER BY be.public_id
  `);

  const claims = await sql.unsafe(`
    SELECT
      c.public_id AS id,
      CASE c.subject_type
        WHEN 'taxon' THEN subject_taxon.public_id
        WHEN 'biological_entity' THEN subject_entity.public_id
        WHEN 'specimen' THEN subject_specimen.public_id
        WHEN 'observation' THEN subject_observation.public_id
        WHEN 'place' THEN subject_place.public_id
        WHEN 'growing_guide' THEN subject_guide.public_id
        ELSE NULL
      END AS subject_id,
      c.subject_type,
      c.predicate,
      c.object_id::text,
      c.object_uri,
      c.object_text,
      c.value_json,
      c.assertion_type,
      c.evidence_level,
      s.public_id AS source_id,
      sr.source_record_id,
      s.license_uri AS license,
      s.attribution AS rights_holder,
      c.review_status
    FROM claims AS c
    JOIN sources AS s ON s.id = c.source_id
    LEFT JOIN source_records AS sr ON sr.id = c.source_record_id
    LEFT JOIN taxa AS subject_taxon
      ON c.subject_type = 'taxon' AND subject_taxon.id = c.subject_id
    LEFT JOIN biological_entities AS subject_entity
      ON c.subject_type = 'biological_entity' AND subject_entity.id = c.subject_id
    LEFT JOIN specimens AS subject_specimen
      ON c.subject_type = 'specimen' AND subject_specimen.id = c.subject_id
    LEFT JOIN observations AS subject_observation
      ON c.subject_type = 'observation' AND subject_observation.id = c.subject_id
    LEFT JOIN places AS subject_place
      ON c.subject_type = 'place' AND subject_place.id = c.subject_id
    LEFT JOIN growing_guides AS subject_guide
      ON c.subject_type = 'growing_guide' AND subject_guide.id = c.subject_id
    WHERE c.visibility = 'public'
      AND c.review_status = 'accepted'
      AND CASE c.subject_type
        WHEN 'taxon' THEN EXISTS (
          SELECT 1 FROM biological_entities AS public_entity
          WHERE public_entity.taxon_id = subject_taxon.id
            AND public_entity.visibility = 'public'
        )
        WHEN 'biological_entity' THEN subject_entity.visibility = 'public'
        WHEN 'specimen' THEN subject_specimen.visibility = 'public'
        WHEN 'observation' THEN subject_observation.visibility = 'public'
        WHEN 'place' THEN subject_place.visibility = 'public'
        WHEN 'growing_guide' THEN subject_guide.status = 'published'
        ELSE false
      END
      AND NOT EXISTS (
        SELECT 1 FROM biological_entities AS hidden_entity
        WHERE c.object_type = 'biological_entity'
          AND hidden_entity.id = c.object_id
          AND hidden_entity.visibility <> 'public'
      )
      AND NOT EXISTS (
        SELECT 1 FROM specimens AS hidden_specimen
        WHERE c.object_type = 'specimen'
          AND hidden_specimen.id = c.object_id
          AND hidden_specimen.visibility <> 'public'
      )
    ORDER BY c.public_id
  `);

  const guides = await sql.unsafe(`
    SELECT
      g.public_id AS id,
      COALESCE(be.public_id, t.public_id) AS subject_id,
      g.title,
      g.guide_key,
      g.version,
      g.status,
      g.summary,
      MIN(s.public_id) AS source_id,
      MIN(s.license_uri) AS license,
      MIN(s.attribution) AS rights_holder
    FROM growing_guides AS g
    LEFT JOIN biological_entities AS be ON be.id = g.biological_entity_id
    LEFT JOIN taxa AS t ON t.id = g.taxon_id
    JOIN growing_guide_claims AS gc ON gc.growing_guide_id = g.id
    JOIN sources AS s ON s.id = gc.source_id
    WHERE g.status = 'published'
      AND (be.id IS NULL OR be.visibility = 'public')
    GROUP BY g.id, be.public_id, t.public_id
    HAVING COUNT(s.id) > 0
    ORDER BY g.public_id
  `);

  const guideClaims = await sql.unsafe(`
    SELECT
      concat(g.public_id, ':', gc.id::text) AS id,
      g.public_id AS subject_id,
      gc.section_key,
      gc.statement,
      gc.evidence_level,
      gc.assertion_type,
      s.public_id AS source_id,
      s.license_uri AS license,
      s.attribution AS rights_holder
    FROM growing_guide_claims AS gc
    JOIN growing_guides AS g ON g.id = gc.growing_guide_id
    JOIN sources AS s ON s.id = gc.source_id
    LEFT JOIN biological_entities AS be ON be.id = g.biological_entity_id
    WHERE g.status = 'published'
      AND (be.id IS NULL OR be.visibility = 'public')
    ORDER BY g.public_id, gc.id
  `);

  const observations = await sql.unsafe(`
    SELECT DISTINCT ON (o.id)
      o.public_id AS id,
      COALESCE(entity.public_id, specimen_entity.public_id, taxon.public_id, specimen.public_id) AS subject_id,
      COALESCE(entity_name.scientific_name, specimen_taxon.scientific_name, taxon.scientific_name) AS scientific_name,
      o.observed_at,
      o.observation_basis,
      ST_Y(o.geometry_public) AS latitude,
      ST_X(o.geometry_public) AS longitude,
      NULLIF(o.uncertainty->>'coordinateUncertaintyInMeters', '')::double precision AS coordinate_uncertainty,
      place.name AS locality,
      source.public_id AS source_id,
      source.license_uri AS license,
      source.attribution AS rights_holder,
      sr.source_record_id
    FROM observations AS o
    LEFT JOIN specimens AS specimen ON specimen.id = o.specimen_id
    LEFT JOIN biological_entities AS entity ON entity.id = o.biological_entity_id
    LEFT JOIN biological_entities AS specimen_entity ON specimen_entity.id = specimen.biological_entity_id
    LEFT JOIN taxa AS specimen_taxon ON specimen_taxon.id = specimen_entity.taxon_id
    LEFT JOIN taxa AS taxon ON taxon.id = o.taxon_id
    LEFT JOIN taxa AS entity_name ON entity_name.id = entity.taxon_id
    LEFT JOIN places AS place ON place.id = o.place_id AND place.visibility = 'public'
    JOIN record_provenance AS rp ON rp.observation_id = o.id
    JOIN source_records AS sr ON sr.id = rp.source_record_id AND sr.status = 'accepted'
    JOIN sources AS source ON source.id = rp.source_id
    WHERE o.visibility = 'public'
      AND (specimen.id IS NULL OR specimen.visibility = 'public')
      AND (entity.id IS NULL OR entity.visibility = 'public')
      AND (specimen_entity.id IS NULL OR specimen_entity.visibility = 'public')
      AND (place.id IS NULL OR place.visibility = 'public')
    ORDER BY o.id, sr.retrieved_at DESC
  `);

  const usedSourceIds = unique([
    ...taxa.flatMap((row) => row.source_ids),
    ...claims.map((row) => row.source_id),
    ...guides.map((row) => row.source_id),
    ...guideClaims.map((row) => row.source_id),
    ...observations.map((row) => row.source_id),
  ]);
  const sourceRows = await sql.unsafe(`
    SELECT public_id AS id, title, citation, url, license_uri AS license, attribution AS rights_holder
    FROM sources
    ORDER BY public_id
  `);
  const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
  for (const sourceId of usedSourceIds) {
    if (!sourceById.has(sourceId)) {
      throw new Error(`Public export source ${sourceId} is missing`);
    }
  }

  const exportTaxa = taxa.map((row) => {
    const result = {
      id: row.id,
      taxonId: row.taxon_id,
      scientificName: row.scientific_name,
      rank: row.rank,
      taxonomicStatus: row.taxonomic_status,
      sourceIds: row.source_ids,
      license: row.license,
      rightsHolder: row.rights_holder,
    };
    if (!result.sourceIds.length || !result.license || !result.rightsHolder) {
      throw new Error(`Taxon ${result.id} has incomplete provenance`);
    }
    return result;
  });
  const exportClaims = claims.map((row) => {
    const result = {
      id: row.id,
      subjectId: row.subject_id,
      subjectType: row.subject_type,
      predicate: row.predicate,
      ...(row.object_id ? { objectId: row.object_id } : {}),
      ...(row.object_uri ? { objectUri: row.object_uri } : {}),
      ...(row.object_text ? { objectText: row.object_text } : {}),
      ...(row.value_json ? { valueJson: row.value_json } : {}),
      assertionType: row.assertion_type,
      evidenceLevel: row.evidence_level,
      sourceId: row.source_id,
      ...(row.source_record_id ? { sourceRecordId: row.source_record_id } : {}),
      license: row.license,
      rightsHolder: row.rights_holder,
      reviewStatus: row.review_status,
    };
    requireSourceFields(result, `Claim ${result.id}`);
    if (!result.subjectId) throw new Error(`Claim ${result.id} has no subject`);
    return result;
  });
  const exportGuides = guides.map((row) => {
    const result = {
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      guideKey: row.guide_key,
      version: Number(row.version),
      status: row.status,
      ...(row.summary ? { summary: row.summary } : {}),
      sourceId: row.source_id,
      license: row.license,
      rightsHolder: row.rights_holder,
    };
    requireSourceFields(result, `Guide ${result.id}`);
    return result;
  });
  const exportGuideClaims = guideClaims.map((row) => {
    const result = {
      id: row.id,
      subjectId: row.subject_id,
      sectionKey: row.section_key,
      statement: row.statement,
      evidenceLevel: row.evidence_level,
      assertionType: row.assertion_type,
      sourceId: row.source_id,
      license: row.license,
      rightsHolder: row.rights_holder,
    };
    requireSourceFields(result, `Guide claim ${result.id}`);
    return result;
  });
  const basis = {
    human: "HumanObservation",
    photo: "HumanObservation",
    external: "MachineObservation",
    specimen: "MaterialEntity",
  };
  const exportObservations = observations.map((row) => {
    const result = {
      id: row.id,
      subjectId: row.subject_id,
      scientificName: row.scientific_name ?? "Echinopsis pachanoi",
      eventDate: asDate(row.observed_at),
      basisOfRecord: basis[row.observation_basis],
      ...(typeof row.latitude === "number"
        ? { decimalLatitude: row.latitude }
        : {}),
      ...(typeof row.longitude === "number"
        ? { decimalLongitude: row.longitude }
        : {}),
      ...(typeof row.coordinate_uncertainty === "number"
        ? { coordinateUncertaintyInMeters: row.coordinate_uncertainty }
        : {}),
      ...(row.locality ? { locality: row.locality } : {}),
      sourceId: row.source_id,
      license: row.license,
      rightsHolder: row.rights_holder,
      informationWithheld:
        "Exact geometry withheld by WACHUMA publication policy",
    };
    requireSourceFields(result, `Observation ${result.id}`);
    if (!result.subjectId)
      throw new Error(`Observation ${result.id} has no subject`);
    return result;
  });
  const sources = sourceRows
    .filter((row) => usedSourceIds.includes(row.id))
    .map((row) => ({
      id: row.id,
      title: row.title,
      citation: row.citation,
      ...(row.url ? { url: row.url } : {}),
      license: row.license,
      rightsHolder: row.rights_holder,
    }));

  return {
    taxa: exportTaxa,
    claims: exportClaims,
    guides: exportGuides,
    guideClaims: exportGuideClaims,
    observations: exportObservations,
    sources,
  };
}

function buildRoCrate(corpus, dwcaFiles) {
  const fileParts = dwcaFiles.map((file) => ({
    "@id": `dwca/${file.name}`,
  }));
  const entities = [
    ...corpus.taxa.map((row) => ({
      id: row.id,
      type: "Taxon",
      name: row.scientificName,
      license: row.license,
      attribution: row.rightsHolder,
      derivedFrom: row.sourceIds,
      properties: {
        identifier: row.id,
        taxonID: row.taxonId,
        taxonRank: row.rank,
        taxonomicStatus: row.taxonomicStatus,
      },
    })),
    ...corpus.guides.map((row) => ({
      id: row.id,
      type: "CreativeWork",
      name: row.title,
      license: row.license,
      attribution: row.rightsHolder,
      derivedFrom: [row.sourceId],
      properties: {
        identifier: row.id,
        subject: { "@id": row.subjectId },
        version: row.version,
        status: row.status,
      },
    })),
    ...corpus.sources.map((row) => ({
      id: row.id,
      type: "CreativeWork",
      name: row.title,
      license: row.license,
      attribution: row.rightsHolder,
      properties: {
        identifier: row.id,
        citation: row.citation,
        ...(row.url ? { url: row.url } : {}),
      },
    })),
    ...corpus.observations.map((row) => ({
      id: row.id,
      type: "dwc:Occurrence",
      name: row.scientificName,
      license: row.license,
      attribution: row.rightsHolder,
      derivedFrom: [row.sourceId],
      properties: {
        identifier: row.id,
        subject: { "@id": row.subjectId },
        eventDate: row.eventDate,
        basisOfRecord: row.basisOfRecord,
      },
    })),
  ];
  const crate = buildRoCrateMetadata(
    {
      id: "https://wachuma.org/export/public-corpus",
      type: "Dataset",
      name: "WACHUMA public corpus",
      properties: {
        conformsTo: [
          { "@id": "https://dwc.tdwg.org/" },
          { "@id": "https://w3id.org/ro/crate/1.2" },
        ],
        hasPart: fileParts,
        identifier: "wachuma-public-corpus",
      },
    },
    entities,
  );
  const claimNodes = corpus.claims.map((row) => {
    const node = claimToJsonLd({
      id: row.id,
      publicId: row.id,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      subjectPublicId: row.subjectId,
      predicate: row.predicate,
      ...(row.objectId ? { objectId: row.objectId } : {}),
      ...(row.objectUri ? { objectUri: row.objectUri } : {}),
      ...(row.objectText ? { objectText: row.objectText } : {}),
      ...(row.valueJson ? { value: row.valueJson } : {}),
      assertionType: row.assertionType,
      evidenceLevel: row.evidenceLevel,
      sourceId: row.sourceId,
      sourcePublicId: row.sourceId,
      visibility: "public",
      license: row.license,
      reviewStatus: row.reviewStatus,
    });
    return {
      ...node,
      license: row.license,
      attribution: row.rightsHolder,
      identifier: row.id,
      "wachuma:reviewStatus": row.reviewStatus,
    };
  });
  const guideClaimNodes = corpus.guideClaims.map((row) => ({
    "@id": row.id,
    "@type": "wachuma:GrowingGuideClaim",
    identifier: row.id,
    "wachuma:subject": { "@id": row.subjectId },
    "wachuma:sectionKey": row.sectionKey,
    description: row.statement,
    "wachuma:evidenceLevel": row.evidenceLevel,
    "wachuma:assertionType": row.assertionType,
    "prov:wasDerivedFrom": { "@id": row.sourceId },
    license: row.license,
    attribution: row.rightsHolder,
  }));
  crate["@graph"].push(...claimNodes, ...guideClaimNodes);
  return crate;
}

async function writeExport(corpus) {
  const dwcaFiles = buildDarwinCoreFiles(corpus);
  const dwcaZip = buildZip(dwcaFiles);
  const roCrate = `${JSON.stringify(buildRoCrate(corpus, dwcaFiles), null, 2)}\n`;
  const corpusHash = sha256(canonicalJson(corpus));
  const manifest = {
    schemaVersion: "1.0",
    generator: "wachuma-public-export-v0.1.0",
    corpusHash,
    publicationPolicy:
      "Only public, accepted records with source, license and attribution are exported; exact or restricted geometry is never included.",
    counts: Object.fromEntries(
      Object.entries(corpus).map(([key, rows]) => [key, rows.length]),
    ),
    files: {
      "public-corpus.dwca.zip": sha256(dwcaZip),
      "ro-crate-metadata.json": sha256(roCrate),
    },
  };
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "public-corpus.dwca.zip"), dwcaZip);
  await writeFile(resolve(outputDirectory, "ro-crate-metadata.json"), roCrate);
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

const sql = postgres(databaseUrl, { max: 1 });
try {
  const corpus = await readPublicCorpus(sql);
  const manifest = await writeExport(corpus);
  console.log(JSON.stringify({ outputDirectory, ...manifest }, null, 2));
} finally {
  await sql.end();
}
