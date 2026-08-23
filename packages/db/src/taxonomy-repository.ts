import type { Sql } from "postgres";
import type { Id, SpeciesDocument, SpeciesSummary } from "@wachuma/shared";

type SpeciesRow = {
  entity_id: string;
  entity_public_id: string;
  entity_type: SpeciesSummary["entityType"];
  display_name: string;
  entity_visibility: "public";
  taxon_id: string | null;
  taxon_public_id: string | null;
  scientific_name: string;
  rank: SpeciesSummary["rank"];
  taxonomic_status: SpeciesSummary["taxonomicStatus"];
  accepted_name: string | null;
  description: string | null;
  external_identifiers: Array<{
    namespace: string;
    identifier: string;
    canonicalUrl?: string;
  }>;
};

type DistributionRow = {
  public_id: string;
  name: string;
  geometry: string | null;
};

type CulturalRow = {
  relation_type: string;
  value_text: string | null;
  description: string;
  source_public_id: string;
  access_level: "public";
  review_status: string;
};

type SourceRow = {
  public_id: string;
  title: string;
  citation: string;
  url: string | null;
  license_uri: string;
  attribution: string;
  assertion_type: string;
};

type MediaRow = {
  uri: string;
  title: string | null;
  license_uri: string;
  attribution: string;
};

function toSummary(row: SpeciesRow): SpeciesSummary {
  return {
    publicId: row.entity_public_id as SpeciesSummary["publicId"],
    scientificName: row.scientific_name,
    displayName: row.display_name,
    rank: row.rank,
    taxonomicStatus: row.taxonomic_status,
    entityType: row.entity_type,
    ...(row.accepted_name ? { acceptedName: row.accepted_name } : {}),
    visibility: row.entity_visibility,
    externalIdentifiers: row.external_identifiers ?? [],
  };
}

function parseGeometry(
  value: string | null,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function createTaxonomyRepository(sql: Sql) {
  function searchPattern(search: string): string {
    return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  }

  async function findRow(publicId: string): Promise<SpeciesRow | null> {
    const [row] = await sql<SpeciesRow[]>`
      SELECT
        be.id AS entity_id,
        be.public_id AS entity_public_id,
        be.entity_type,
        be.display_name,
        be.visibility AS entity_visibility,
        t.id AS taxon_id,
        t.public_id AS taxon_public_id,
        t.scientific_name,
        t.rank,
        t.taxonomic_status,
        t.accepted_name,
        t.description,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'namespace', ei.namespace,
              'identifier', ei.identifier,
              'canonicalUrl', ei.canonical_url
            )
          ) FILTER (WHERE ei.id IS NOT NULL),
          '[]'::json
        ) AS external_identifiers
      FROM biological_entities AS be
      JOIN taxa AS t ON t.id = be.taxon_id
      LEFT JOIN external_identifiers AS ei
        ON ei.taxon_id = t.id OR ei.biological_entity_id = be.id
      WHERE be.visibility = 'public'
        AND (be.public_id = ${publicId} OR t.public_id = ${publicId})
      GROUP BY be.id, t.id
      ORDER BY (be.public_id = ${publicId}) DESC
      LIMIT 1
    `;
    return row ?? null;
  }

  return {
    async listPublicSpecies(
      options: {
        search?: string | undefined;
        limit?: number | undefined;
      } = {},
    ): Promise<SpeciesSummary[]> {
      const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);
      const search = options.search?.trim();
      const pattern = searchPattern(search ?? "");
      const rows = search
        ? await sql<SpeciesRow[]>`
            SELECT
              be.id AS entity_id,
              be.public_id AS entity_public_id,
              be.entity_type,
              be.display_name,
              be.visibility AS entity_visibility,
              t.id AS taxon_id,
              t.public_id AS taxon_public_id,
              t.scientific_name,
              t.rank,
              t.taxonomic_status,
              t.accepted_name,
              t.description,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object(
                    'namespace', ei.namespace,
                    'identifier', ei.identifier,
                    'canonicalUrl', ei.canonical_url
                  )
                ) FILTER (WHERE ei.id IS NOT NULL),
                '[]'::json
              ) AS external_identifiers
            FROM biological_entities AS be
            JOIN taxa AS t ON t.id = be.taxon_id
            LEFT JOIN external_identifiers AS ei
              ON ei.taxon_id = t.id OR ei.biological_entity_id = be.id
            WHERE be.visibility = 'public'
              AND (
                t.scientific_name ILIKE ${pattern}
                OR COALESCE(t.accepted_name, '') ILIKE ${pattern}
                OR be.display_name ILIKE ${pattern}
                OR EXISTS (
                  SELECT 1
                  FROM external_identifiers AS search_identifier
                  WHERE (
                    search_identifier.taxon_id = t.id
                    OR search_identifier.biological_entity_id = be.id
                  )
                    AND (
                      search_identifier.namespace ILIKE ${pattern}
                      OR search_identifier.identifier ILIKE ${pattern}
                      OR (search_identifier.namespace || ':' || search_identifier.identifier) ILIKE ${pattern}
                    )
                )
                OR EXISTS (
                  SELECT 1
                  FROM cultural_relations AS search_relation
                  WHERE (
                    search_relation.taxon_id = t.id
                    OR search_relation.biological_entity_id = be.id
                  )
                    AND search_relation.value_text ILIKE ${pattern}
                    AND search_relation.access_level = 'public'
                    AND search_relation.review_status = 'accepted'
                    AND search_relation.sensitivity = 'normal'
                )
              )
            GROUP BY be.id, t.id
            ORDER BY be.display_name ASC
            LIMIT ${limit}
          `
        : await sql<SpeciesRow[]>`
            SELECT
              be.id AS entity_id,
              be.public_id AS entity_public_id,
              be.entity_type,
              be.display_name,
              be.visibility AS entity_visibility,
              t.id AS taxon_id,
              t.public_id AS taxon_public_id,
              t.scientific_name,
              t.rank,
              t.taxonomic_status,
              t.accepted_name,
              t.description,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object(
                    'namespace', ei.namespace,
                    'identifier', ei.identifier,
                    'canonicalUrl', ei.canonical_url
                  )
                ) FILTER (WHERE ei.id IS NOT NULL),
                '[]'::json
              ) AS external_identifiers
            FROM biological_entities AS be
            JOIN taxa AS t ON t.id = be.taxon_id
            LEFT JOIN external_identifiers AS ei
              ON ei.taxon_id = t.id OR ei.biological_entity_id = be.id
            WHERE be.visibility = 'public'
            GROUP BY be.id, t.id
            ORDER BY be.display_name ASC
            LIMIT ${limit}
          `;

      return rows.map(toSummary);
    },

    async getPublicSpecies(publicId: string): Promise<SpeciesDocument | null> {
      const row = await findRow(publicId);
      if (!row) return null;

      const [distribution, culturalRelations, sources, media] =
        await Promise.all([
          sql<DistributionRow[]>`
            SELECT DISTINCT
              p.public_id,
              p.name,
              ST_AsGeoJSON(p.geometry_public) AS geometry
            FROM observations AS o
            JOIN places AS p ON p.id = o.place_id
            WHERE o.visibility = 'public'
              AND p.visibility = 'public'
              AND (
                o.taxon_id = ${row.taxon_id}
                OR o.biological_entity_id = ${row.entity_id}
              )
          `,
          sql<CulturalRow[]>`
            SELECT
              cr.relation_type,
              cr.value_text,
              cr.description,
              s.public_id AS source_public_id,
              cr.access_level,
              cr.review_status
            FROM cultural_relations AS cr
            JOIN sources AS s ON s.id = cr.source_id
            LEFT JOIN communities AS c
              ON c.id = cr.community_id
             AND c.visibility = 'public'
            LEFT JOIN places AS p
              ON p.id = cr.place_id
             AND p.visibility = 'public'
            WHERE cr.access_level = 'public'
              AND cr.review_status = 'accepted'
              AND cr.sensitivity = 'normal'
              AND (cr.community_id IS NULL OR c.id IS NOT NULL)
              AND (cr.place_id IS NULL OR p.id IS NOT NULL)
              AND (
                cr.taxon_id = ${row.taxon_id}
                OR cr.biological_entity_id = ${row.entity_id}
              )
          `,
          sql<SourceRow[]>`
            SELECT DISTINCT
              s.public_id,
              s.title,
              s.citation,
              s.url,
              s.license_uri,
              s.attribution,
              s.source_type AS assertion_type
            FROM sources AS s
            JOIN cultural_relations AS cr ON cr.source_id = s.id
            LEFT JOIN communities AS c
              ON c.id = cr.community_id
             AND c.visibility = 'public'
            LEFT JOIN places AS p
              ON p.id = cr.place_id
             AND p.visibility = 'public'
            WHERE cr.access_level = 'public'
              AND cr.review_status = 'accepted'
              AND cr.sensitivity = 'normal'
              AND (cr.community_id IS NULL OR c.id IS NOT NULL)
              AND (cr.place_id IS NULL OR p.id IS NOT NULL)
              AND (
                cr.taxon_id = ${row.taxon_id}
                OR cr.biological_entity_id = ${row.entity_id}
              )
          `,
          sql<MediaRow[]>`
            SELECT DISTINCT
              m.uri,
              m.title,
              m.license_uri,
              m.attribution
            FROM media AS m
            JOIN media_attachments AS ma ON ma.media_id = m.id
            WHERE m.visibility = 'public'
              AND (
                ma.taxon_id = ${row.taxon_id}
                OR ma.biological_entity_id = ${row.entity_id}
              )
          `,
        ]);

      const summary = toSummary(row);
      return {
        ...summary,
        id: row.entity_id as SpeciesDocument["id"],
        ...(row.taxon_id ? { taxonId: row.taxon_id as Id } : {}),
        description: row.description ?? "",
        ecology: [],
        distribution: distribution.map((place) => {
          const geometry = parseGeometry(place.geometry);
          return {
            placePublicId: place.public_id as SpeciesDocument["publicId"],
            label: place.name,
            ...(geometry ? { geometry } : {}),
          };
        }),
        cultivation: [],
        vernacularNames: culturalRelations
          .filter((relation) => relation.relation_type === "vernacular_name")
          .map((relation) => ({
            term: relation.value_text ?? relation.description,
            relationType: "vernacular_name" as const,
            context: relation.description,
            sourcePublicId:
              relation.source_public_id as SpeciesDocument["publicId"],
            accessLevel: relation.access_level,
            reviewStatus: relation.review_status as
              "draft" | "under-review" | "accepted" | "rejected",
          })),
        culturalRelations: culturalRelations.map((relation) => ({
          relationType: relation.relation_type,
          description: relation.description,
          sourcePublicId:
            relation.source_public_id as SpeciesDocument["publicId"],
          accessLevel: relation.access_level,
          reviewStatus: relation.review_status,
        })),
        history: [],
        sources: sources.map((source) => ({
          publicId: source.public_id as SpeciesDocument["publicId"],
          title: source.title,
          citation: source.citation,
          ...(source.url ? { url: source.url } : {}),
          license: source.license_uri,
          attribution: source.attribution,
          assertionType: source.assertion_type,
        })),
        relatedSpecies: [],
        media: media.map((item) => ({
          uri: item.uri,
          ...(item.title ? { title: item.title } : {}),
          license: item.license_uri,
          attribution: item.attribution,
        })),
      };
    },
  };
}
