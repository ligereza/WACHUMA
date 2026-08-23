import type { Sql } from "postgres";
import {
  DomainError,
  NotFoundError,
  type AdminCultivationEventCreateInput,
  type AdminCultivationEventRecord,
  type AdminLocationCreateInput,
  type AdminLocationRecord,
  type AdminLocationUpdateInput,
  type AdminSpecimenCreateInput,
  type AdminSpecimenLocationInput,
  type AdminSpecimenRecord,
  type AdminSpecimenUpdateInput,
  type Location,
  type PublicCultivationEvent,
  type Visibility,
} from "@wachuma/shared";

type LocationRow = {
  public_id: string;
  name: string;
  location_type: Location["locationType"];
  parent_public_id: string | null;
  geometry_public: string | null;
  visibility: Visibility;
  notes: string | null;
};

type SpecimenRow = {
  public_id: string;
  specimen_type: AdminSpecimenRecord["specimenType"];
  biological_entity_public_id: string;
  status: AdminSpecimenRecord["status"];
  visibility: Visibility;
  acquired_at: string | null;
  notes: string | null;
  current_location_public_id: string | null;
};

type EventRow = {
  id: string;
  specimen_public_id: string;
  location_public_id: string | null;
  event_type: PublicCultivationEvent["eventType"];
  occurred_at: string;
  notes: string | null;
  measurements: Record<string, unknown>;
  source_public_id: string | null;
};

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

function toLocation(row: LocationRow): AdminLocationRecord {
  const geometryPublic = parseGeometry(row.geometry_public);
  return {
    publicId: row.public_id as AdminLocationRecord["publicId"],
    name: row.name,
    locationType: row.location_type,
    ...(row.parent_public_id
      ? {
          parentPublicId: row.parent_public_id as NonNullable<
            AdminLocationRecord["parentPublicId"]
          >,
        }
      : {}),
    ...(geometryPublic ? { geometryPublic } : {}),
    visibility: row.visibility,
    ...(row.notes ? { notes: row.notes } : {}),
  };
}

function toSpecimen(row: SpecimenRow): AdminSpecimenRecord {
  return {
    publicId: row.public_id as AdminSpecimenRecord["publicId"],
    specimenType: row.specimen_type,
    biologicalEntityPublicId:
      row.biological_entity_public_id as AdminSpecimenRecord["biologicalEntityPublicId"],
    status: row.status,
    visibility: row.visibility,
    ...(row.acquired_at ? { acquiredAt: row.acquired_at } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    ...(row.current_location_public_id
      ? {
          currentLocationPublicId:
            row.current_location_public_id as NonNullable<
              AdminSpecimenRecord["currentLocationPublicId"]
            >,
        }
      : {}),
  };
}

function toEvent(row: EventRow): AdminCultivationEventRecord {
  return {
    id: row.id as AdminCultivationEventRecord["id"],
    specimenPublicId:
      row.specimen_public_id as AdminCultivationEventRecord["specimenPublicId"],
    ...(row.location_public_id
      ? {
          locationPublicId: row.location_public_id as NonNullable<
            AdminCultivationEventRecord["locationPublicId"]
          >,
        }
      : {}),
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    ...(row.notes ? { notes: row.notes } : {}),
    measurements: row.measurements,
    ...(row.source_public_id
      ? {
          sourcePublicId: row.source_public_id as NonNullable<
            AdminCultivationEventRecord["sourcePublicId"]
          >,
        }
      : {}),
  };
}

function rethrowDatabaseError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === "23505") {
    throw new DomainError(
      "conflict",
      "A record with this identifier already exists",
      409,
    );
  }
  if (code === "23503") {
    throw new DomainError(
      "validation_error",
      "A referenced record does not exist",
      400,
    );
  }
  throw error;
}

export function createGardenAdminRepository(sql: Sql) {
  async function locationId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM locations WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Location", publicId);
    return row.id;
  }

  async function specimenId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM specimens WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Specimen", publicId);
    return row.id;
  }

  async function entityId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM biological_entities WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Biological entity", publicId);
    return row.id;
  }

  async function sourceId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM sources WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Source", publicId);
    return row.id;
  }

  async function getLocation(
    publicId: string,
  ): Promise<AdminLocationRecord | null> {
    const [row] = await sql<LocationRow[]>`
      SELECT
        location.public_id,
        location.name,
        location.location_type,
        parent.public_id AS parent_public_id,
        ST_AsGeoJSON(location.geometry_public) AS geometry_public,
        location.visibility,
        location.notes
      FROM locations AS location
      LEFT JOIN locations AS parent ON parent.id = location.parent_location_id
      WHERE location.public_id = ${publicId}
      LIMIT 1
    `;
    return row ? toLocation(row) : null;
  }

  async function getSpecimen(
    publicId: string,
  ): Promise<AdminSpecimenRecord | null> {
    const [row] = await sql<SpecimenRow[]>`
      SELECT
        specimen.public_id,
        specimen.specimen_type,
        entity.public_id AS biological_entity_public_id,
        specimen.status,
        specimen.visibility,
        specimen.acquired_at,
        specimen.notes,
        location.public_id AS current_location_public_id
      FROM specimens AS specimen
      JOIN biological_entities AS entity ON entity.id = specimen.biological_entity_id
      LEFT JOIN specimen_locations AS assignment
        ON assignment.specimen_id = specimen.id AND assignment.is_current = true
      LEFT JOIN locations AS location ON location.id = assignment.location_id
      WHERE specimen.public_id = ${publicId}
      LIMIT 1
    `;
    return row ? toSpecimen(row) : null;
  }

  async function getEvent(
    id: string,
  ): Promise<AdminCultivationEventRecord | null> {
    const [row] = await sql<EventRow[]>`
      SELECT
        event.id,
        specimen.public_id AS specimen_public_id,
        location.public_id AS location_public_id,
        event.event_type,
        event.occurred_at,
        event.notes,
        event.measurements,
        source.public_id AS source_public_id
      FROM cultivation_events AS event
      JOIN specimens AS specimen ON specimen.id = event.specimen_id
      LEFT JOIN locations AS location ON location.id = event.location_id
      LEFT JOIN sources AS source ON source.id = event.source_id
      WHERE event.id = ${id}
      LIMIT 1
    `;
    return row ? toEvent(row) : null;
  }

  return {
    async listLocations(): Promise<AdminLocationRecord[]> {
      const rows = await sql<LocationRow[]>`
        SELECT
          location.public_id,
          location.name,
          location.location_type,
          parent.public_id AS parent_public_id,
          ST_AsGeoJSON(location.geometry_public) AS geometry_public,
          location.visibility,
          location.notes
        FROM locations AS location
        LEFT JOIN locations AS parent ON parent.id = location.parent_location_id
        ORDER BY location.public_id ASC
        LIMIT 500
      `;
      return rows.map(toLocation);
    },

    async getLocation(publicId: string): Promise<AdminLocationRecord | null> {
      return getLocation(publicId);
    },

    async createLocation(
      input: AdminLocationCreateInput,
    ): Promise<AdminLocationRecord> {
      try {
        const parentId = input.parentPublicId
          ? await locationId(input.parentPublicId)
          : null;
        const [row] = await sql<LocationRow[]>`
          INSERT INTO locations (
            public_id, name, location_type, parent_location_id,
            geometry_public, geometry_exact, visibility, notes
          ) VALUES (
            ${input.publicId},
            ${input.name},
            ${input.locationType},
            ${parentId},
            ST_SetSRID(ST_GeomFromGeoJSON(${input.geometryPublic ? JSON.stringify(input.geometryPublic) : null}), 4326),
            ST_SetSRID(ST_GeomFromGeoJSON(${input.geometryExact ? JSON.stringify(input.geometryExact) : null}), 4326),
            ${input.visibility},
            ${input.notes ?? null}
          )
          RETURNING
            public_id,
            name,
            location_type,
            NULL::text AS parent_public_id,
            ST_AsGeoJSON(geometry_public) AS geometry_public,
            visibility,
            notes
        `;
        if (!row)
          throw new DomainError(
            "internal_error",
            "Location was not created",
            500,
          );
        return toLocation(row);
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },

    async updateLocation(
      publicId: string,
      input: AdminLocationUpdateInput,
    ): Promise<AdminLocationRecord> {
      try {
        const parentId =
          input.parentPublicId !== undefined
            ? await locationId(input.parentPublicId)
            : null;
        const [row] = await sql<LocationRow[]>`
          UPDATE locations AS location
          SET
            name = COALESCE(${input.name ?? null}, location.name),
            location_type = COALESCE(${input.locationType ?? null}, location.location_type),
            parent_location_id = CASE
              WHEN ${input.parentPublicId !== undefined} THEN ${parentId}
              ELSE location.parent_location_id
            END,
            geometry_public = CASE
              WHEN ${input.geometryPublic !== undefined}
                THEN ST_SetSRID(ST_GeomFromGeoJSON(${input.geometryPublic ? JSON.stringify(input.geometryPublic) : null}), 4326)
              ELSE location.geometry_public
            END,
            geometry_exact = CASE
              WHEN ${input.geometryExact !== undefined}
                THEN ST_SetSRID(ST_GeomFromGeoJSON(${input.geometryExact ? JSON.stringify(input.geometryExact) : null}), 4326)
              ELSE location.geometry_exact
            END,
            visibility = COALESCE(${input.visibility ?? null}, location.visibility),
            notes = CASE
              WHEN ${input.notes !== undefined} THEN ${input.notes ?? null}
              ELSE location.notes
            END,
            updated_at = now()
          WHERE location.public_id = ${publicId}
          RETURNING
            location.public_id,
            location.name,
            location.location_type,
            (SELECT parent.public_id FROM locations AS parent WHERE parent.id = location.parent_location_id) AS parent_public_id,
            ST_AsGeoJSON(location.geometry_public) AS geometry_public,
            location.visibility,
            location.notes
        `;
        if (!row) throw new NotFoundError("Location", publicId);
        return toLocation(row);
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },

    async archiveLocation(publicId: string): Promise<void> {
      const result = await sql`
        UPDATE locations
        SET visibility = 'restricted',
            notes = concat_ws(E'\\n', notes, 'Archived by protected API'),
            updated_at = now()
        WHERE public_id = ${publicId}
      `;
      if (result.count === 0) throw new NotFoundError("Location", publicId);
    },

    async listSpecimens(): Promise<AdminSpecimenRecord[]> {
      const rows = await sql<SpecimenRow[]>`
        SELECT
          specimen.public_id,
          specimen.specimen_type,
          entity.public_id AS biological_entity_public_id,
          specimen.status,
          specimen.visibility,
          specimen.acquired_at,
          specimen.notes,
          location.public_id AS current_location_public_id
        FROM specimens AS specimen
        JOIN biological_entities AS entity ON entity.id = specimen.biological_entity_id
        LEFT JOIN specimen_locations AS assignment
          ON assignment.specimen_id = specimen.id AND assignment.is_current = true
        LEFT JOIN locations AS location ON location.id = assignment.location_id
        ORDER BY specimen.public_id ASC
        LIMIT 500
      `;
      return rows.map(toSpecimen);
    },

    async getSpecimen(publicId: string): Promise<AdminSpecimenRecord | null> {
      return getSpecimen(publicId);
    },

    async createSpecimen(
      input: AdminSpecimenCreateInput,
    ): Promise<AdminSpecimenRecord> {
      try {
        const biologicalEntityId = await entityId(
          input.biologicalEntityPublicId,
        );
        const [row] = await sql<SpecimenRow[]>`
          WITH created AS (
            INSERT INTO specimens (
              public_id, specimen_type, biological_entity_id, status,
              visibility, acquired_at, notes
            ) VALUES (
              ${input.publicId},
              ${input.specimenType},
              ${biologicalEntityId},
              ${input.status},
              ${input.visibility},
              ${input.acquiredAt ?? null},
              ${input.notes ?? null}
            )
            RETURNING *
          )
          SELECT
            created.public_id,
            created.specimen_type,
            entity.public_id AS biological_entity_public_id,
            created.status,
            created.visibility,
            created.acquired_at,
            created.notes,
            NULL::text AS current_location_public_id
          FROM created
          JOIN biological_entities AS entity ON entity.id = created.biological_entity_id
        `;
        if (!row)
          throw new DomainError(
            "internal_error",
            "Specimen was not created",
            500,
          );
        return toSpecimen(row);
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },

    async updateSpecimen(
      publicId: string,
      input: AdminSpecimenUpdateInput,
    ): Promise<AdminSpecimenRecord> {
      try {
        const biologicalEntityId = input.biologicalEntityPublicId
          ? await entityId(input.biologicalEntityPublicId)
          : null;
        const [row] = await sql<SpecimenRow[]>`
          UPDATE specimens AS specimen
          SET
            specimen_type = COALESCE(${input.specimenType ?? null}, specimen.specimen_type),
            biological_entity_id = COALESCE(${biologicalEntityId}, specimen.biological_entity_id),
            status = COALESCE(${input.status ?? null}, specimen.status),
            visibility = COALESCE(${input.visibility ?? null}, specimen.visibility),
            acquired_at = CASE
              WHEN ${input.acquiredAt !== undefined} THEN ${input.acquiredAt ?? null}
              ELSE specimen.acquired_at
            END,
            notes = CASE
              WHEN ${input.notes !== undefined} THEN ${input.notes ?? null}
              ELSE specimen.notes
            END,
            updated_at = now()
          FROM biological_entities AS entity
          WHERE specimen.public_id = ${publicId}
            AND entity.id = specimen.biological_entity_id
          RETURNING
            specimen.public_id,
            specimen.specimen_type,
            entity.public_id AS biological_entity_public_id,
            specimen.status,
            specimen.visibility,
            specimen.acquired_at,
            specimen.notes,
            (
              SELECT location.public_id
              FROM specimen_locations AS assignment
              JOIN locations AS location ON location.id = assignment.location_id
              WHERE assignment.specimen_id = specimen.id
                AND assignment.is_current = true
              LIMIT 1
            ) AS current_location_public_id
        `;
        if (!row) throw new NotFoundError("Specimen", publicId);
        return toSpecimen(row);
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },

    async archiveSpecimen(publicId: string): Promise<void> {
      const result = await sql`
        UPDATE specimens
        SET status = 'archived',
            visibility = 'restricted',
            notes = concat_ws(E'\\n', notes, 'Archived by protected API'),
            updated_at = now()
        WHERE public_id = ${publicId}
      `;
      if (result.count === 0) throw new NotFoundError("Specimen", publicId);
    },

    async assignSpecimenLocation(
      specimenPublicId: string,
      input: AdminSpecimenLocationInput,
    ): Promise<AdminSpecimenRecord> {
      const result = await sql.begin(async (transaction) => {
        const [specimen] = await transaction<{ id: string }[]>`
          SELECT id FROM specimens WHERE public_id = ${specimenPublicId} LIMIT 1
        `;
        if (!specimen) throw new NotFoundError("Specimen", specimenPublicId);
        const [location] = await transaction<{ id: string }[]>`
          SELECT id FROM locations WHERE public_id = ${input.locationPublicId} LIMIT 1
        `;
        if (!location)
          throw new NotFoundError("Location", input.locationPublicId);
        await transaction`
          UPDATE specimen_locations
          SET is_current = false, ends_at = COALESCE(ends_at, now())
          WHERE specimen_id = ${specimen.id} AND is_current = true
        `;
        await transaction`
          INSERT INTO specimen_locations (
            specimen_id, location_id, starts_at, is_current
          ) VALUES (
            ${specimen.id}, ${location.id}, ${input.startsAt ?? new Date().toISOString()}, true
          )
        `;
        return specimen.id;
      });
      if (!result)
        throw new DomainError(
          "internal_error",
          "Location was not assigned",
          500,
        );
      const updated = await getSpecimen(specimenPublicId);
      if (!updated) throw new NotFoundError("Specimen", specimenPublicId);
      return updated;
    },

    async clearSpecimenLocation(
      specimenPublicId: string,
    ): Promise<AdminSpecimenRecord> {
      const specimen = await specimenId(specimenPublicId);
      await sql`
        UPDATE specimen_locations
        SET is_current = false, ends_at = COALESCE(ends_at, now())
        WHERE specimen_id = ${specimen} AND is_current = true
      `;
      const updated = await getSpecimen(specimenPublicId);
      if (!updated) throw new NotFoundError("Specimen", specimenPublicId);
      return updated;
    },

    async createCultivationEvent(
      input: AdminCultivationEventCreateInput,
    ): Promise<AdminCultivationEventRecord> {
      const specimen = await specimenId(input.specimenPublicId);
      const location = input.locationPublicId
        ? await locationId(input.locationPublicId)
        : null;
      const source = input.sourcePublicId
        ? await sourceId(input.sourcePublicId)
        : null;
      const measurements = JSON.stringify(input.measurements);
      const [row] = await sql<EventRow[]>`
        INSERT INTO cultivation_events (
          specimen_id, location_id, event_type, occurred_at, notes,
          measurements, source_id
        ) VALUES (
          ${specimen}, ${location}, ${input.eventType}, ${input.occurredAt},
          ${input.notes ?? null}, ${measurements}::jsonb, ${source}
        )
        RETURNING
          id,
          ${input.specimenPublicId}::text AS specimen_public_id,
          ${input.locationPublicId ?? null}::text AS location_public_id,
          event_type,
          occurred_at,
          notes,
          measurements,
          ${input.sourcePublicId ?? null}::text AS source_public_id
      `;
      if (!row)
        throw new DomainError("internal_error", "Event was not created", 500);
      const event = await getEvent(row.id);
      if (!event)
        throw new DomainError("internal_error", "Event was not readable", 500);
      return event;
    },
  };
}
