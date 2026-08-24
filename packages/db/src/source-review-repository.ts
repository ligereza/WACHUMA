import type { Sql } from "postgres";
import type {
  AdminSourceRecord,
  AdminSourceRecordTarget,
  AdminSourceRecordReviewInput,
  AdminTaxonPromotion,
  AdminTaxonPromotionInput,
} from "@wachuma/shared";
import { DomainError } from "@wachuma/shared";

type SourceRecordRow = {
  id: string;
  provider_key: string;
  source_record_id: string;
  source_url: string | null;
  retrieved_at: string;
  license_uri: string;
  attribution: string;
  assertion_type: string;
  raw_payload: Record<string, unknown>;
  status: AdminSourceRecord["status"];
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  targets: AdminSourceRecordTarget[];
};

function toRecord(row: SourceRecordRow): AdminSourceRecord {
  return {
    id: row.id,
    providerKey: row.provider_key,
    sourceRecordId: row.source_record_id,
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    retrievedAt: row.retrieved_at,
    license: row.license_uri,
    attribution: row.attribution,
    assertionType: row.assertion_type,
    rawPayload: row.raw_payload,
    status: row.status,
    ...(row.review_notes ? { reviewNotes: row.review_notes } : {}),
    ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}),
    ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
    targets: row.targets ?? [],
  };
}

export function isPubliclyUsableLicense(license: string): boolean {
  const normalized = license.trim().toLowerCase();
  return (
    normalized === "cc0" ||
    normalized.includes("creativecommons.org/publicdomain/zero") ||
    normalized.includes("creativecommons.org/licenses/by/4.0") ||
    normalized === "cc by 4.0" ||
    normalized.includes("creativecommons.org/licenses/by/3.0") ||
    normalized === "cc by 3.0"
  );
}

export function createSourceReviewRepository(sql: Sql) {
  return {
    async listSourceRecords(
      options: {
        providerKey?: string;
        status?: AdminSourceRecord["status"];
        limit?: number;
      } = {},
    ): Promise<AdminSourceRecord[]> {
      const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
      const rows = await sql<SourceRecordRow[]>`
        SELECT
          source_record.id,
          data_source.provider_key,
          source_record.source_record_id,
          source_record.source_url,
          source_record.retrieved_at,
          source_record.license_uri,
          source_record.attribution,
          source_record.assertion_type,
          source_record.raw_payload,
          source_record.status,
          source_record.review_notes,
          source_record.reviewed_by,
          source_record.reviewed_at,
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_strip_nulls(
                jsonb_build_object(
                  'kind', CASE
                    WHEN provenance.taxon_id IS NOT NULL THEN 'taxon'
                    WHEN provenance.biological_entity_id IS NOT NULL THEN 'biological_entity'
                    WHEN provenance.observation_id IS NOT NULL THEN 'observation'
                    WHEN provenance.media_id IS NOT NULL THEN 'media'
                    WHEN provenance.specimen_id IS NOT NULL THEN 'specimen'
                    WHEN provenance.lineage_relationship_id IS NOT NULL THEN 'lineage_relationship'
                    WHEN provenance.external_identifier_id IS NOT NULL THEN 'external_identifier'
                  END,
                  'publicId', COALESCE(
                    target_taxon.public_id,
                    target_entity.public_id,
                    target_observation.public_id,
                    target_specimen.public_id
                  ),
                  'id', COALESCE(
                    target_media.id::text,
                    target_lineage.id::text,
                    target_external_identifier.id::text
                  ),
                  'visibility', COALESCE(
                    target_entity.visibility,
                    target_observation.visibility,
                    target_specimen.visibility,
                    target_media.visibility
                  ),
                  'uri', target_media.uri,
                  'title', target_media.title,
                  'mediaType', target_media.media_type,
                  'license', target_media.license_uri,
                  'namespace', target_external_identifier.namespace,
                  'identifier', target_external_identifier.identifier,
                  'canonicalUrl', target_external_identifier.canonical_url
                )
              )
            ) FILTER (WHERE provenance.id IS NOT NULL),
            '[]'::jsonb
          ) AS targets
        FROM source_records AS source_record
        JOIN data_sources AS data_source
          ON data_source.id = source_record.data_source_id
        LEFT JOIN record_provenance AS provenance
          ON provenance.source_record_id = source_record.id
        LEFT JOIN taxa AS target_taxon
          ON target_taxon.id = provenance.taxon_id
        LEFT JOIN biological_entities AS target_entity
          ON target_entity.id = provenance.biological_entity_id
        LEFT JOIN observations AS target_observation
          ON target_observation.id = provenance.observation_id
        LEFT JOIN specimens AS target_specimen
          ON target_specimen.id = provenance.specimen_id
        LEFT JOIN media AS target_media
          ON target_media.id = provenance.media_id
        LEFT JOIN lineage_relationships AS target_lineage
          ON target_lineage.id = provenance.lineage_relationship_id
        LEFT JOIN external_identifiers AS target_external_identifier
          ON target_external_identifier.id = provenance.external_identifier_id
        WHERE (${options.providerKey ?? null}::text IS NULL
          OR data_source.provider_key = ${options.providerKey ?? null})
          AND (${options.status ?? null}::text IS NULL
          OR source_record.status = ${options.status ?? null})
        GROUP BY
          source_record.id,
          data_source.provider_key,
          source_record.source_record_id,
          source_record.source_url,
          source_record.retrieved_at,
          source_record.license_uri,
          source_record.attribution,
          source_record.assertion_type,
          source_record.raw_payload,
          source_record.status,
          source_record.review_notes,
          source_record.reviewed_by,
          source_record.reviewed_at
        ORDER BY source_record.retrieved_at DESC, source_record.id ASC
        LIMIT ${limit}
      `;
      return rows.map(toRecord);
    },

    async reviewSourceRecord(
      sourceRecordId: string,
      input: AdminSourceRecordReviewInput,
    ): Promise<AdminSourceRecord | null> {
      return sql.begin(async (transaction) => {
        const [record] = await transaction<SourceRecordRow[]>`
          SELECT
            source_record.id,
            data_source.provider_key,
            source_record.source_record_id,
            source_record.source_url,
            source_record.retrieved_at,
            source_record.license_uri,
            source_record.attribution,
            source_record.assertion_type,
            source_record.raw_payload,
            source_record.status,
            source_record.review_notes,
            source_record.reviewed_by,
            source_record.reviewed_at,
            COALESCE(
              jsonb_agg(
                DISTINCT jsonb_strip_nulls(
                  jsonb_build_object(
                    'kind', CASE
                      WHEN provenance.taxon_id IS NOT NULL THEN 'taxon'
                      WHEN provenance.biological_entity_id IS NOT NULL THEN 'biological_entity'
                      WHEN provenance.observation_id IS NOT NULL THEN 'observation'
                    WHEN provenance.media_id IS NOT NULL THEN 'media'
                    WHEN provenance.specimen_id IS NOT NULL THEN 'specimen'
                    WHEN provenance.lineage_relationship_id IS NOT NULL THEN 'lineage_relationship'
                    WHEN provenance.external_identifier_id IS NOT NULL THEN 'external_identifier'
                  END,
                    'publicId', COALESCE(
                      target_taxon.public_id,
                      target_entity.public_id,
                      target_observation.public_id,
                      target_specimen.public_id
                    ),
                    'id', COALESCE(
                      target_media.id::text,
                      target_lineage.id::text,
                      target_external_identifier.id::text
                    ),
                    'visibility', COALESCE(
                      target_entity.visibility,
                      target_observation.visibility,
                      target_specimen.visibility,
                      target_media.visibility
                    ),
                    'uri', target_media.uri,
                    'title', target_media.title,
                    'mediaType', target_media.media_type,
                    'license', target_media.license_uri,
                    'namespace', target_external_identifier.namespace,
                    'identifier', target_external_identifier.identifier,
                    'canonicalUrl', target_external_identifier.canonical_url
                  )
                )
              ) FILTER (WHERE provenance.id IS NOT NULL),
              '[]'::jsonb
            ) AS targets
          FROM source_records AS source_record
          JOIN data_sources AS data_source
            ON data_source.id = source_record.data_source_id
          LEFT JOIN record_provenance AS provenance
            ON provenance.source_record_id = source_record.id
          LEFT JOIN taxa AS target_taxon
            ON target_taxon.id = provenance.taxon_id
          LEFT JOIN biological_entities AS target_entity
            ON target_entity.id = provenance.biological_entity_id
          LEFT JOIN observations AS target_observation
            ON target_observation.id = provenance.observation_id
          LEFT JOIN specimens AS target_specimen
            ON target_specimen.id = provenance.specimen_id
          LEFT JOIN media AS target_media
            ON target_media.id = provenance.media_id
          LEFT JOIN lineage_relationships AS target_lineage
            ON target_lineage.id = provenance.lineage_relationship_id
          LEFT JOIN external_identifiers AS target_external_identifier
            ON target_external_identifier.id = provenance.external_identifier_id
          WHERE source_record.id = ${sourceRecordId}
          GROUP BY
            source_record.id,
            data_source.provider_key,
            source_record.source_record_id,
            source_record.source_url,
            source_record.retrieved_at,
            source_record.license_uri,
            source_record.attribution,
            source_record.assertion_type,
            source_record.raw_payload,
            source_record.status,
            source_record.review_notes,
            source_record.reviewed_by,
            source_record.reviewed_at
          LIMIT 1
        `;
        if (!record) return null;

        if (
          input.decision === "accepted" &&
          (!input.licenseConfirmed ||
            !input.attributionConfirmed ||
            !input.privacyConfirmed)
        ) {
          throw new Error(
            "Accepted source records require license, attribution and privacy confirmation",
          );
        }

        const reviewedAt = new Date().toISOString();
        await transaction`
          INSERT INTO source_record_reviews (
            source_record_id, reviewer, decision, note,
            license_confirmed, attribution_confirmed, privacy_confirmed,
            taxonomy_confirmed, reviewed_at, review_kind
          ) VALUES (
            ${sourceRecordId},
            ${input.reviewer},
            ${input.decision},
            ${input.note},
            ${input.licenseConfirmed},
            ${input.attributionConfirmed},
            ${input.privacyConfirmed},
            false,
            ${reviewedAt},
            'publication'
          )
        `;

        await transaction`
          UPDATE source_records
          SET status = ${input.decision},
              review_notes = ${input.note},
              reviewed_by = ${input.reviewer},
              reviewed_at = ${reviewedAt}
          WHERE id = ${sourceRecordId}
        `;

        const publishObservation =
          input.decision === "accepted" &&
          input.licenseConfirmed &&
          input.attributionConfirmed &&
          input.privacyConfirmed &&
          isPubliclyUsableLicense(record.license_uri);

        if (publishObservation) {
          await transaction`
            UPDATE specimens AS specimen
            SET visibility = 'public',
                updated_at = now()
            WHERE EXISTS (
              SELECT 1
              FROM record_provenance AS provenance
              WHERE provenance.specimen_id = specimen.id
                AND provenance.source_record_id = ${sourceRecordId}
            )
          `;

          await transaction`
            UPDATE observations AS observation
            SET visibility = 'public'
            WHERE EXISTS (
              SELECT 1
              FROM record_provenance AS provenance
              WHERE provenance.observation_id = observation.id
                AND provenance.source_record_id = ${sourceRecordId}
            )
          `;

          await transaction`
            UPDATE media AS media
            SET visibility = 'public'
            WHERE EXISTS (
              SELECT 1
              FROM record_provenance AS provenance
              WHERE provenance.media_id = media.id
                AND provenance.source_record_id = ${sourceRecordId}
            )
          `;
        } else if (input.decision === "rejected") {
          await transaction`
            UPDATE specimens AS specimen
            SET visibility = 'restricted',
                updated_at = now()
            WHERE EXISTS (
              SELECT 1
              FROM record_provenance AS provenance
              WHERE provenance.specimen_id = specimen.id
                AND provenance.source_record_id = ${sourceRecordId}
            )
          `;

          await transaction`
            UPDATE observations AS observation
            SET visibility = 'restricted'
            WHERE EXISTS (
              SELECT 1
              FROM record_provenance AS provenance
              WHERE provenance.observation_id = observation.id
                AND provenance.source_record_id = ${sourceRecordId}
            )
          `;

          await transaction`
            UPDATE media AS media
            SET visibility = 'restricted'
            WHERE EXISTS (
              SELECT 1
              FROM record_provenance AS provenance
              WHERE provenance.media_id = media.id
                AND provenance.source_record_id = ${sourceRecordId}
            )
          `;
        }

        return toRecord({
          ...record,
          status: input.decision,
          review_notes: input.note,
          reviewed_by: input.reviewer,
          reviewed_at: reviewedAt,
        });
      });
    },

    async promoteTaxonProjection(
      sourceRecordId: string,
      input: AdminTaxonPromotionInput,
    ): Promise<AdminTaxonPromotion | null> {
      return sql.begin(async (transaction) => {
        const [record] = await transaction<
          Array<{
            provider_key: string;
            source_record_id: string;
            license_uri: string;
            status: AdminSourceRecord["status"];
          }>
        >`
          SELECT
            data_source.provider_key,
            source_record.source_record_id,
            source_record.license_uri,
            source_record.status
          FROM source_records AS source_record
          JOIN data_sources AS data_source
            ON data_source.id = source_record.data_source_id
          WHERE source_record.id = ${sourceRecordId}
          LIMIT 1
        `;
        if (!record) return null;

        if (
          record.provider_key !== "gbif" ||
          !record.source_record_id.startsWith("species:")
        ) {
          throw new DomainError(
            "conflict",
            "Only GBIF species projections can be promoted through this endpoint",
            409,
          );
        }
        if (record.status !== "accepted") {
          throw new DomainError(
            "conflict",
            "The GBIF species source record must pass publication review before taxonomic promotion",
            409,
          );
        }
        if (!isPubliclyUsableLicense(record.license_uri)) {
          throw new DomainError(
            "license_required",
            "The GBIF species source record does not have a compatible public license",
            400,
          );
        }

        const [projection] = await transaction<
          Array<{
            taxon_public_id: string;
            biological_entity_public_id: string;
            biological_entity_id: string;
          }>
        >`
          SELECT
            taxon.public_id AS taxon_public_id,
            biological_entity.public_id AS biological_entity_public_id,
            biological_entity.id AS biological_entity_id
          FROM record_provenance AS provenance
          JOIN taxa AS taxon ON taxon.id = provenance.taxon_id
          JOIN biological_entities AS biological_entity
            ON biological_entity.taxon_id = taxon.id
          WHERE provenance.source_record_id = ${sourceRecordId}
            AND provenance.taxon_id IS NOT NULL
          LIMIT 1
        `;
        if (!projection) {
          throw new DomainError(
            "not_found",
            "No GBIF taxonomic projection is linked to this source record",
            404,
          );
        }

        const promotedAt = new Date().toISOString();
        await transaction`
          INSERT INTO source_record_reviews (
            source_record_id, reviewer, decision, note,
            license_confirmed, attribution_confirmed, privacy_confirmed,
            taxonomy_confirmed, reviewed_at, review_kind
          ) VALUES (
            ${sourceRecordId},
            ${input.reviewer},
            'accepted',
            ${input.note},
            ${input.licenseConfirmed},
            ${input.attributionConfirmed},
            ${input.privacyConfirmed},
            ${input.taxonomyConfirmed},
            ${promotedAt},
            'taxonomic_promotion'
          )
        `;

        await transaction`
          UPDATE biological_entities
          SET visibility = 'public',
              authority_note = 'Proyección GBIF promovida tras revisión taxonómica, de licencia, atribución y privacidad.',
              updated_at = now()
          WHERE id = ${projection.biological_entity_id}
        `;

        return {
          sourceRecordId,
          taxonPublicId:
            projection.taxon_public_id as AdminTaxonPromotion["taxonPublicId"],
          biologicalEntityPublicId:
            projection.biological_entity_public_id as AdminTaxonPromotion["biologicalEntityPublicId"],
          visibility: "public",
          reviewer: input.reviewer,
          promotedAt,
        };
      });
    },
  };
}
