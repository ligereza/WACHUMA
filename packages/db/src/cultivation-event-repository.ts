import type { Sql } from "postgres";
import type { PublicCultivationEvent } from "@wachuma/shared";

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

function toEvent(row: EventRow): PublicCultivationEvent {
  return {
    id: row.id as PublicCultivationEvent["id"],
    specimenPublicId:
      row.specimen_public_id as PublicCultivationEvent["specimenPublicId"],
    ...(row.location_public_id
      ? {
          locationPublicId: row.location_public_id as NonNullable<
            PublicCultivationEvent["locationPublicId"]
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
            PublicCultivationEvent["sourcePublicId"]
          >,
        }
      : {}),
  };
}

export function createCultivationEventRepository(sql: Sql) {
  return {
    async listPublicEvents(
      specimenPublicId?: string,
    ): Promise<PublicCultivationEvent[]> {
      const rows = specimenPublicId
        ? await sql<EventRow[]>`
            SELECT
              ce.id,
              specimen.public_id AS specimen_public_id,
              location.public_id AS location_public_id,
              ce.event_type,
              ce.occurred_at,
              ce.notes,
              ce.measurements,
              source.public_id AS source_public_id
            FROM cultivation_events AS ce
            JOIN specimens AS specimen
              ON specimen.id = ce.specimen_id
             AND specimen.visibility = 'public'
            JOIN biological_entities AS entity
              ON entity.id = specimen.biological_entity_id
             AND entity.visibility = 'public'
            LEFT JOIN locations AS location
              ON location.id = ce.location_id
             AND location.visibility = 'public'
            LEFT JOIN sources AS source ON source.id = ce.source_id
            WHERE specimen.public_id = ${specimenPublicId}
            ORDER BY ce.occurred_at DESC, ce.id ASC
          `
        : await sql<EventRow[]>`
            SELECT
              ce.id,
              specimen.public_id AS specimen_public_id,
              location.public_id AS location_public_id,
              ce.event_type,
              ce.occurred_at,
              ce.notes,
              ce.measurements,
              source.public_id AS source_public_id
            FROM cultivation_events AS ce
            JOIN specimens AS specimen
              ON specimen.id = ce.specimen_id
             AND specimen.visibility = 'public'
            JOIN biological_entities AS entity
              ON entity.id = specimen.biological_entity_id
             AND entity.visibility = 'public'
            LEFT JOIN locations AS location
              ON location.id = ce.location_id
             AND location.visibility = 'public'
            LEFT JOIN sources AS source ON source.id = ce.source_id
            ORDER BY ce.occurred_at DESC, ce.id ASC
            LIMIT 500
          `;
      return rows.map(toEvent);
    },
  };
}
