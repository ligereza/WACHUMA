import type { Sql } from "postgres";
import type { DerivationEvent, DerivationMaterial } from "@wachuma/shared";

type MaterialRow = {
  event_id: string;
  material_id: string;
  direction: DerivationMaterial["direction"];
  biological_entity_id: string | null;
  specimen_id: string | null;
  culture_id: string | null;
  label: string | null;
  quantity: number | null;
  unit: string | null;
  material_notes: string | null;
};

type EventRow = {
  id: string;
  public_id: string;
  event_type: DerivationEvent["eventType"];
  method: string | null;
  occurred_at: string;
  operator_agent_id: string | null;
  location_id: string | null;
  source_id: string | null;
  notes: string | null;
  visibility: DerivationEvent["visibility"];
};

function toMaterial(row: MaterialRow): DerivationMaterial {
  return {
    id: row.material_id as DerivationMaterial["id"],
    direction: row.direction,
    ...(row.biological_entity_id
      ? {
          biologicalEntityId: row.biological_entity_id as NonNullable<
            DerivationMaterial["biologicalEntityId"]
          >,
        }
      : {}),
    ...(row.specimen_id
      ? {
          specimenId: row.specimen_id as NonNullable<
            DerivationMaterial["specimenId"]
          >,
        }
      : {}),
    ...(row.culture_id
      ? {
          cultureId: row.culture_id as NonNullable<
            DerivationMaterial["cultureId"]
          >,
        }
      : {}),
    ...(row.label ? { label: row.label } : {}),
    ...(row.quantity === null ? {} : { quantity: Number(row.quantity) }),
    ...(row.unit ? { unit: row.unit } : {}),
    ...(row.material_notes ? { notes: row.material_notes } : {}),
  };
}

export function createDerivationRepository(sql: Sql) {
  return {
    async listPublicDerivations(
      subjectPublicId?: string,
      limit = 100,
    ): Promise<DerivationEvent[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const events = await sql<EventRow[]>`
        SELECT DISTINCT event.*
        FROM derivation_events AS event
        JOIN derivation_event_materials AS material
          ON material.derivation_event_id = event.id
        LEFT JOIN specimens AS specimen ON specimen.id = material.specimen_id
        LEFT JOIN biological_entities AS entity
          ON entity.id = material.biological_entity_id
        LEFT JOIN cultures AS culture ON culture.id = material.culture_id
        WHERE event.visibility = 'public'
          AND (
            ${subjectPublicId ?? null}::text IS NULL
            OR specimen.public_id = ${subjectPublicId ?? null}::text
            OR entity.public_id = ${subjectPublicId ?? null}::text
            OR culture.public_id = ${subjectPublicId ?? null}::text
          )
        ORDER BY event.occurred_at DESC
        LIMIT ${safeLimit}
      `;
      if (events.length === 0) return [];

      const eventIds = events.map((event) => event.id);
      const materials = await sql<MaterialRow[]>`
        SELECT
          event_id,
          id AS material_id,
          direction,
          biological_entity_id,
          specimen_id,
          culture_id,
          label,
          quantity,
          unit,
          notes AS material_notes
        FROM derivation_event_materials
        WHERE event_id = ANY(${sql.array(eventIds)})
        ORDER BY direction, id
      `;
      const grouped = new Map<string, DerivationMaterial[]>();
      for (const material of materials) {
        const list = grouped.get(material.event_id) ?? [];
        list.push(toMaterial(material));
        grouped.set(material.event_id, list);
      }
      return events.map((event) => ({
        id: event.id as DerivationEvent["id"],
        publicId: event.public_id as DerivationEvent["publicId"],
        eventType: event.event_type,
        ...(event.method ? { method: event.method } : {}),
        occurredAt: event.occurred_at,
        ...(event.operator_agent_id
          ? {
              operatorAgentId: event.operator_agent_id as NonNullable<
                DerivationEvent["operatorAgentId"]
              >,
            }
          : {}),
        ...(event.location_id
          ? {
              locationId: event.location_id as NonNullable<
                DerivationEvent["locationId"]
              >,
            }
          : {}),
        ...(event.source_id
          ? {
              sourceId: event.source_id as NonNullable<
                DerivationEvent["sourceId"]
              >,
            }
          : {}),
        ...(event.notes ? { notes: event.notes } : {}),
        visibility: "public",
        materials: grouped.get(event.id) ?? [],
      }));
    },
  };
}
