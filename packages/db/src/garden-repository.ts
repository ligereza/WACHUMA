import type { Sql } from "postgres";
import type { Location, PublicLocation, SpecimenRecord } from "@wachuma/shared";

type SpecimenRow = {
  id: string;
  public_id: string;
  specimen_type: SpecimenRecord["specimenType"];
  biological_entity_id: string;
  biological_entity_public_id: string;
  biological_entity_type: SpecimenRecord["biologicalEntityType"];
  status: SpecimenRecord["status"];
  visibility: "public";
  acquired_at: string | null;
  location_id: string | null;
  location_public_id: string | null;
  location_name: string | null;
  location_type: Location["locationType"] | null;
  location_visibility: "public" | null;
};

type LocationRow = {
  id: string;
  public_id: string;
  name: string;
  location_type: Location["locationType"];
  parent_location_id: string | null;
  geometry_public: string | null;
  visibility: "public";
  notes: string | null;
};

function toSpecimenLocation(row: SpecimenRow): PublicLocation | undefined {
  if (
    !row.location_id ||
    !row.location_public_id ||
    !row.location_name ||
    !row.location_type ||
    row.location_visibility !== "public"
  ) {
    return undefined;
  }

  return {
    publicId: row.location_public_id as PublicLocation["publicId"],
    name: row.location_name,
    locationType: row.location_type,
    visibility: "public",
  };
}

function toSpecimen(row: SpecimenRow): SpecimenRecord {
  const location = toSpecimenLocation(row);
  return {
    id: row.id as SpecimenRecord["id"],
    publicId: row.public_id as SpecimenRecord["publicId"],
    specimenType: row.specimen_type,
    biologicalEntityId:
      row.biological_entity_id as SpecimenRecord["biologicalEntityId"],
    biologicalEntityPublicId: row.biological_entity_public_id as NonNullable<
      SpecimenRecord["biologicalEntityPublicId"]
    >,
    biologicalEntityType: row.biological_entity_type,
    status: row.status,
    visibility: row.visibility,
    ...(row.acquired_at ? { acquiredAt: row.acquired_at } : {}),
    ...(location ? { currentLocation: location } : {}),
    qrUrl: `https://wachuma.org/specimens/${row.public_id}`,
  };
}

export function createGardenRepository(sql: Sql) {
  function toLocation(row: LocationRow): PublicLocation {
    let geometryPublic: Record<string, unknown> | undefined;
    if (row.geometry_public) {
      try {
        geometryPublic = JSON.parse(row.geometry_public) as Record<
          string,
          unknown
        >;
      } catch {
        geometryPublic = undefined;
      }
    }
    return {
      publicId: row.public_id as PublicLocation["publicId"],
      name: row.name,
      locationType: row.location_type,
      ...(row.parent_location_id
        ? {
            parentPublicId: row.parent_location_id as NonNullable<
              PublicLocation["parentPublicId"]
            >,
          }
        : {}),
      ...(geometryPublic ? { geometryPublic } : {}),
      visibility: row.visibility,
      ...(row.notes ? { notes: row.notes } : {}),
    };
  }

  async function findPublicSpecimen(
    publicId: string,
  ): Promise<SpecimenRecord | null> {
    const [row] = await sql<SpecimenRow[]>`
      SELECT
        s.id,
        s.public_id,
        s.specimen_type,
        s.biological_entity_id,
        be.public_id AS biological_entity_public_id,
        be.entity_type AS biological_entity_type,
        s.status,
        s.visibility,
        s.acquired_at,
        l.id AS location_id,
        l.public_id AS location_public_id,
        l.name AS location_name,
        l.location_type,
        l.visibility AS location_visibility
      FROM specimens AS s
      JOIN biological_entities AS be ON be.id = s.biological_entity_id
      LEFT JOIN specimen_locations AS sl
        ON sl.specimen_id = s.id
       AND sl.is_current = true
      LEFT JOIN locations AS l
        ON l.id = sl.location_id
       AND l.visibility = 'public'
      WHERE s.public_id = ${publicId}
        AND s.visibility = 'public'
        AND be.visibility = 'public'
      LIMIT 1
    `;
    return row ? toSpecimen(row) : null;
  }

  return {
    async listPublicSpecimens(limit = 24): Promise<SpecimenRecord[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const rows = await sql<SpecimenRow[]>`
        SELECT
          s.id,
          s.public_id,
          s.specimen_type,
          s.biological_entity_id,
          be.public_id AS biological_entity_public_id,
          be.entity_type AS biological_entity_type,
          s.status,
          s.visibility,
          s.acquired_at,
          l.id AS location_id,
          l.public_id AS location_public_id,
          l.name AS location_name,
          l.location_type,
          l.visibility AS location_visibility
        FROM specimens AS s
        JOIN biological_entities AS be ON be.id = s.biological_entity_id
        LEFT JOIN specimen_locations AS sl
          ON sl.specimen_id = s.id
         AND sl.is_current = true
        LEFT JOIN locations AS l
          ON l.id = sl.location_id
         AND l.visibility = 'public'
        WHERE s.visibility = 'public'
          AND be.visibility = 'public'
        ORDER BY s.public_id ASC
        LIMIT ${safeLimit}
      `;
      return rows.map(toSpecimen);
    },

    async getPublicSpecimen(publicId: string): Promise<SpecimenRecord | null> {
      return findPublicSpecimen(publicId);
    },

    async listPublicLocations(limit = 100): Promise<PublicLocation[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const rows = await sql<LocationRow[]>`
        SELECT
          l.id,
          l.public_id,
          l.name,
          l.location_type,
          parent.public_id AS parent_location_id,
          ST_AsGeoJSON(l.geometry_public) AS geometry_public,
          l.visibility,
          l.notes
        FROM locations AS l
        LEFT JOIN locations AS parent
          ON parent.id = l.parent_location_id
         AND parent.visibility = 'public'
        WHERE l.visibility = 'public'
        ORDER BY l.name ASC
        LIMIT ${safeLimit}
      `;
      return rows.map(toLocation);
    },
  };
}
