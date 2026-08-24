import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readEditorialContent } from "./editorial-content.mjs";
// The database workspace owns the PostgreSQL client; the root scripts package
// intentionally does not duplicate that runtime dependency.
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for audit:content-db; this audit never falls back to fixtures.",
  );
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

const editorialContent = await readEditorialContent(root);
const speciesDocuments = editorialContent.species;
// Archived guides and draft cultural relations are editorial fixtures, not
// members of the public corpus. They may be loaded by the verification seed,
// but the public seed deliberately omits them.
const guideDocuments = editorialContent.guides.filter(
  (document) => document.status === "published",
);
const cultureDocuments = editorialContent.cultures
  .map((document) => ({
    ...document,
    relations: document.relations.filter(
      (relation) => relation.reviewStatus !== "draft",
    ),
  }))
  .filter((document) => document.relations.length > 0);

const sql = postgres(databaseUrl, { max: 1 });
const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}
function normalizeDatabaseDate(value, dateOnly = false) {
  if (!(value instanceof Date)) return value;
  return dateOnly
    ? value.toISOString().slice(0, 10)
    : value.toISOString().replace(".000Z", "Z");
}
function normalizeGuideCoverage(sections) {
  return sections.map((section) => ({
    sectionKey: section.sectionKey,
    status: section.status,
    ...(section.note ? { note: section.note } : {}),
  }));
}

try {
  for (const document of speciesDocuments) {
    const [entity] = await sql`
      SELECT
        entity.id,
        taxon.id AS taxon_id,
        entity.public_id,
        entity.visibility,
        entity.entity_type,
        entity.authority_note,
        taxon.public_id AS taxon_public_id,
        taxon.scientific_name,
        taxon.rank,
        taxon.taxonomic_status,
        taxon.description AS taxon_description
      FROM biological_entities AS entity
      JOIN taxa AS taxon ON taxon.id = entity.taxon_id
      WHERE entity.public_id = ${document.publicId}
      LIMIT 1
    `;
    check(
      Boolean(entity),
      `species ${document.publicId} exists in content but not in PostgreSQL`,
    );
    if (!entity) continue;

    const isPublicSpecies = (document.visibility ?? "public") === "public";
    check(
      entity.visibility === (document.visibility ?? "public"),
      `species ${document.publicId} visibility differs between content and PostgreSQL`,
    );
    check(
      entity.scientific_name === document.scientificName,
      `species ${document.publicId} scientific name differs between content and PostgreSQL`,
    );
    check(
      entity.rank === (document.rank ?? "species"),
      `species ${document.publicId} rank differs between content and PostgreSQL`,
    );
    check(
      entity.taxonomic_status === (document.taxonomicStatus ?? "accepted"),
      `species ${document.publicId} taxonomic status differs between content and PostgreSQL`,
    );
    check(
      entity.taxon_description === (document.description ?? null),
      `species ${document.publicId} description differs between content and PostgreSQL`,
    );
    check(
      entity.entity_type === (document.entityType ?? "species"),
      `species ${document.publicId} entity type differs between content and PostgreSQL`,
    );
    check(
      entity.authority_note === (document.authorityNote ?? null),
      `species ${document.publicId} authority note differs between content and PostgreSQL`,
    );

    const identifiers = await sql`
      SELECT namespace, identifier, canonical_url, license_uri
      FROM external_identifiers
      WHERE taxon_id = ${entity.taxon_public_id ? sql`(SELECT id FROM taxa WHERE public_id = ${entity.taxon_public_id})` : null}
         OR biological_entity_id = ${entity.id}
      ORDER BY namespace, identifier
    `;
    const actualIdentifiers = new Set(
      identifiers.map((item) => `${item.namespace}:${item.identifier}`),
    );
    for (const identifier of document.externalIdentifiers ?? []) {
      check(
        actualIdentifiers.has(
          `${identifier.namespace}:${identifier.identifier}`,
        ),
        `species ${document.publicId} external identifier ${identifier.namespace}:${identifier.identifier} is not persisted`,
      );
      const actualIdentifier = identifiers.find(
        (item) =>
          item.namespace === identifier.namespace &&
          item.identifier === identifier.identifier,
      );
      check(
        actualIdentifier?.canonical_url === (identifier.canonicalUrl ?? null),
        `species ${document.publicId} external identifier ${identifier.namespace}:${identifier.identifier} URL differs between content and PostgreSQL`,
      );
      check(
        actualIdentifier?.license_uri === identifier.license,
        `species ${document.publicId} external identifier ${identifier.namespace}:${identifier.identifier} license differs between content and PostgreSQL`,
      );
    }

    for (const source of document.sources ?? []) {
      const [sourceRow] = await sql`
        SELECT id, source_type, title, citation, url, doi, license_uri,
               attribution, published_on, accessed_at
        FROM sources
        WHERE public_id = ${source.publicId}
        LIMIT 1
      `;
      check(
        Boolean(sourceRow),
        `species ${document.publicId} references source ${source.publicId}, but the source is absent from PostgreSQL`,
      );
      if (sourceRow) {
        for (const [field, actual, expected] of [
          ["sourceType", sourceRow.source_type, source.sourceType],
          ["title", sourceRow.title, source.title],
          ["citation", sourceRow.citation, source.citation],
          ["url", sourceRow.url, source.url ?? null],
          ["doi", sourceRow.doi, source.doi ?? null],
          ["license", sourceRow.license_uri, source.license],
          ["attribution", sourceRow.attribution, source.attribution],
          [
            "publishedOn",
            normalizeDatabaseDate(sourceRow.published_on, true),
            source.publishedOn ?? null,
          ],
          [
            "accessedAt",
            normalizeDatabaseDate(sourceRow.accessed_at),
            source.accessedAt ?? null,
          ],
        ]) {
          check(
            actual === expected,
            `source ${source.publicId} ${field} differs between content and PostgreSQL`,
          );
        }
      }
    }

    const persistedClaims = await sql`
      SELECT
        claim.public_id,
        claim.predicate,
        claim.object_text,
        claim.assertion_type,
        claim.evidence_level,
        source.public_id AS source_public_id,
        source_record.source_record_id AS provider_source_record_id,
        claim.author_perspective,
        claim.recorded_on,
        claim.visibility,
        claim.review_status
      FROM claims AS claim
      JOIN sources AS source ON source.id = claim.source_id
      LEFT JOIN source_records AS source_record
        ON source_record.id = claim.source_record_id
      WHERE claim.subject_type = 'taxon'
        AND claim.subject_id = ${entity.taxon_id}
        AND claim.source_record_id IS NOT NULL
      ORDER BY claim.public_id ASC
    `;
    const expectedClaims = document.claims ?? [];
    check(
      persistedClaims.length === expectedClaims.length,
      `species ${document.publicId} has ${persistedClaims.length} persisted claims but content declares ${expectedClaims.length}`,
    );
    for (const expected of expectedClaims) {
      const actual = persistedClaims.find(
        (claim) => claim.public_id === expected.publicId,
      );
      check(
        Boolean(actual),
        `species ${document.publicId} claim ${expected.publicId} is not persisted`,
      );
      if (!actual) continue;
      const fields = [
        ["predicate", actual.predicate, expected.predicate],
        ["statement", actual.object_text, expected.statement],
        ["assertionType", actual.assertion_type, expected.assertionType],
        ["evidenceLevel", actual.evidence_level, expected.evidenceLevel],
        ["sourcePublicId", actual.source_public_id, expected.sourcePublicId],
        [
          "sourceRecordId",
          actual.provider_source_record_id,
          expected.sourceRecordId,
        ],
        [
          "authorPerspective",
          actual.author_perspective,
          expected.authorPerspective,
        ],
        [
          "recordedOn",
          normalizeDatabaseDate(actual.recorded_on, true),
          expected.recordedOn,
        ],
        ["visibility", actual.visibility, expected.visibility],
        ["reviewStatus", actual.review_status, expected.reviewStatus],
      ];
      for (const [field, actualValue, expectedValue] of fields) {
        check(
          actualValue === expectedValue,
          `species ${document.publicId} claim ${expected.publicId} ${field} differs between content and PostgreSQL`,
        );
      }
    }

    const publicObservations = await sql`
      SELECT observation.public_id
      FROM observations AS observation
      WHERE observation.visibility = 'public'
        AND observation.observation_basis = 'external'
        AND (
          observation.taxon_id = ${entity.taxon_id}
          OR observation.biological_entity_id = ${entity.id}
        )
      ORDER BY observation.public_id ASC
    `;
    const expectedObservationIds = new Set(
      (document.distribution ?? [])
        .map((item) => item.observationPublicId)
        .filter(Boolean),
    );
    const actualObservationIds = new Set(
      publicObservations.map((item) => item.public_id),
    );
    if (!isPublicSpecies) {
      check(
        publicObservations.length === 0,
        `species ${document.publicId} is restricted but has public observations`,
      );
    }
    for (const observationId of expectedObservationIds) {
      if (!isPublicSpecies) continue;
      check(
        actualObservationIds.has(observationId),
        `species ${document.publicId} distribution observation ${observationId} is not a public persisted observation`,
      );
    }

    const publicMedia = await sql`
      SELECT DISTINCT media.uri
      FROM media
      JOIN media_attachments AS attachment
        ON attachment.media_id = media.id
      LEFT JOIN observations AS observation
        ON observation.id = attachment.observation_id
      WHERE media.visibility = 'public'
        AND (
          attachment.taxon_id = ${entity.taxon_id}
          OR attachment.biological_entity_id = ${entity.id}
          OR (
            observation.visibility = 'public'
            AND (
              observation.taxon_id = ${entity.taxon_id}
              OR observation.biological_entity_id = ${entity.id}
            )
          )
        )
      ORDER BY media.uri ASC
    `;
    const expectedMediaUris = new Set(
      (document.media ?? []).map((item) => item.uri),
    );
    const actualMediaUris = new Set(publicMedia.map((item) => item.uri));
    if (!isPublicSpecies) {
      check(
        publicMedia.length === 0,
        `species ${document.publicId} is restricted but has public media`,
      );
    }
    for (const mediaUri of expectedMediaUris) {
      if (!isPublicSpecies) continue;
      check(
        actualMediaUris.has(mediaUri),
        `species ${document.publicId} media ${mediaUri} is not publicly persisted`,
      );
    }
  }

  for (const document of guideDocuments) {
    const [guide] = await sql`
      SELECT
        guide.id,
        guide.public_id,
        guide.guide_key,
        guide.version,
        guide.title,
        guide.status,
        guide.summary,
        guide.coverage,
        COALESCE(taxon.public_id, entity.public_id) AS subject_public_id
      FROM growing_guides AS guide
      LEFT JOIN taxa AS taxon ON taxon.id = guide.taxon_id
      LEFT JOIN biological_entities AS entity
        ON entity.id = guide.biological_entity_id
      WHERE guide.public_id = ${document.publicId}
      LIMIT 1
    `;
    check(
      Boolean(guide),
      `guide ${document.publicId} exists in content but not in PostgreSQL`,
    );
    if (!guide) continue;

    check(
      guide.guide_key === document.guideKey,
      `guide ${document.publicId} guideKey differs between content and PostgreSQL`,
    );
    check(
      guide.version === document.version,
      `guide ${document.publicId} version differs between content and PostgreSQL`,
    );
    check(
      guide.title === document.title,
      `guide ${document.publicId} title differs between content and PostgreSQL`,
    );
    check(
      guide.status === document.status,
      `guide ${document.publicId} status differs between content and PostgreSQL`,
    );
    check(
      guide.subject_public_id ===
        (document.taxonPublicId ?? document.biologicalEntityPublicId),
      `guide ${document.publicId} subject differs between content and PostgreSQL`,
    );
    check(
      guide.summary === (document.summary ?? null),
      `guide ${document.publicId} summary differs between content and PostgreSQL`,
    );
    check(
      JSON.stringify(normalizeGuideCoverage(guide.coverage)) ===
        JSON.stringify(normalizeGuideCoverage(document.coverage.sections)),
      `guide ${document.publicId} section coverage differs between content and PostgreSQL`,
    );

    const claims = await sql`
      SELECT
        claim.section_key,
        claim.statement,
        claim.evidence_level,
        claim.assertion_type,
        source.public_id AS source_public_id
      FROM growing_guide_claims AS claim
      LEFT JOIN sources AS source ON source.id = claim.source_id
      WHERE claim.growing_guide_id = ${guide.id}
      ORDER BY claim.created_at ASC, claim.id ASC
    `;
    check(
      claims.length === document.claims.length,
      `guide ${document.publicId} has ${claims.length} persisted claims but content declares ${document.claims.length}`,
    );
    for (const [index, expected] of document.claims.entries()) {
      const actual = claims[index];
      if (!actual) continue;
      for (const [field, actualValue, expectedValue] of [
        ["sectionKey", actual.section_key, expected.sectionKey],
        ["statement", actual.statement, expected.statement],
        ["evidenceLevel", actual.evidence_level, expected.evidenceLevel],
        ["assertionType", actual.assertion_type, expected.assertionType],
        ["sourcePublicId", actual.source_public_id, expected.sourcePublicId],
      ]) {
        check(
          actualValue === expectedValue,
          `guide ${document.publicId} claim ${index + 1} ${field} differs between content and PostgreSQL`,
        );
      }
    }
  }

  for (const document of cultureDocuments) {
    for (const relation of document.relations ?? []) {
      const [row] = await sql`
        SELECT
          cultural.public_id,
          cultural.relation_type,
          biological_entity.public_id AS biological_entity_public_id,
          taxon.public_id AS taxon_public_id,
          community.public_id AS community_public_id,
          culture.public_id AS culture_public_id,
          place.public_id AS place_public_id,
          historical_period.public_id AS historical_period_public_id,
          agent.public_id AS documented_by_agent_public_id,
          source.public_id AS source_public_id,
          cultural.value_text,
          cultural.description,
          cultural.evidence_level,
          cultural.assertion_type,
          cultural.author_perspective,
          access_level,
          sensitivity,
          review_status,
          cultural.license_uri,
          cultural.review_notes,
          cultural.recorded_on
        FROM cultural_relations AS cultural
        LEFT JOIN biological_entities AS biological_entity
          ON biological_entity.id = cultural.biological_entity_id
        LEFT JOIN taxa AS taxon
          ON taxon.id = cultural.taxon_id
        LEFT JOIN communities AS community
          ON community.id = cultural.community_id
        LEFT JOIN cultures AS culture
          ON culture.id = cultural.culture_id
        LEFT JOIN places AS place
          ON place.id = cultural.place_id
        LEFT JOIN historical_periods AS historical_period
          ON historical_period.id = cultural.historical_period_id
        LEFT JOIN agents AS agent
          ON agent.id = cultural.documented_by_agent_id
        LEFT JOIN sources AS source
          ON source.id = cultural.source_id
        WHERE cultural.public_id = ${relation.publicId}
        LIMIT 1
      `;
      check(
        Boolean(row),
        `cultural relation ${relation.publicId} exists in content but not in PostgreSQL`,
      );
      if (!row) continue;
      check(
        row.relation_type === relation.relationType,
        `cultural relation ${relation.publicId} relation type differs between content and PostgreSQL`,
      );
      check(
        (row.biological_entity_public_id ?? row.taxon_public_id) ===
          relation.subjectPublicId,
        `cultural relation ${relation.publicId} subject differs between content and PostgreSQL`,
      );
      check(
        row.community_public_id === (relation.communityPublicId ?? null),
        `cultural relation ${relation.publicId} community differs between content and PostgreSQL`,
      );
      check(
        row.culture_public_id === (relation.culturePublicId ?? null),
        `cultural relation ${relation.publicId} culture differs between content and PostgreSQL`,
      );
      check(
        row.place_public_id === (relation.placePublicId ?? null),
        `cultural relation ${relation.publicId} place differs between content and PostgreSQL`,
      );
      check(
        row.historical_period_public_id ===
          (relation.historicalPeriodPublicId ?? null),
        `cultural relation ${relation.publicId} historical period differs between content and PostgreSQL`,
      );
      check(
        row.documented_by_agent_public_id ===
          (relation.documentedByAgentPublicId ?? null),
        `cultural relation ${relation.publicId} documenting agent differs between content and PostgreSQL`,
      );
      for (const [field, actual, expected] of [
        ["source", row.source_public_id, relation.sourcePublicId],
        ["valueText", row.value_text, relation.valueText ?? null],
        ["description", row.description, relation.description],
        ["evidenceLevel", row.evidence_level, relation.evidenceLevel],
        ["assertionType", row.assertion_type, relation.assertionType],
        [
          "authorPerspective",
          row.author_perspective,
          relation.authorPerspective,
        ],
        ["license", row.license_uri, relation.license],
        ["reviewNote", row.review_notes, relation.reviewNote],
        [
          "recordedOn",
          row.recorded_on instanceof Date
            ? row.recorded_on.toISOString().slice(0, 10)
            : row.recorded_on,
          relation.recordedOn ?? null,
        ],
      ]) {
        check(
          actual === expected,
          `cultural relation ${relation.publicId} ${field} differs between content and PostgreSQL`,
        );
      }
      check(
        row.access_level === relation.accessLevel,
        `cultural relation ${relation.publicId} access level differs between content and PostgreSQL`,
      );
      check(
        row.sensitivity === relation.sensitivity,
        `cultural relation ${relation.publicId} sensitivity differs between content and PostgreSQL`,
      );
      check(
        row.review_status === relation.reviewStatus,
        `cultural relation ${relation.publicId} review status differs between content and PostgreSQL`,
      );
      check(
        Boolean(row.source_public_id),
        `cultural relation ${relation.publicId} has no source in PostgreSQL`,
      );
      check(
        Boolean(row.community_public_id || row.culture_public_id),
        `cultural relation ${relation.publicId} has no community or biological culture context in PostgreSQL`,
      );
    }
  }

  assert.equal(
    failures.length,
    0,
    `Content/database parity audit failed:\n- ${failures.join("\n- ")}`,
  );

  console.log(
    JSON.stringify({
      species: speciesDocuments.length,
      guides: guideDocuments.length,
      culturalRelations: cultureDocuments.reduce(
        (count, document) => count + (document.relations?.length ?? 0),
        0,
      ),
      failures: 0,
    }),
  );
} finally {
  await sql.end();
}
