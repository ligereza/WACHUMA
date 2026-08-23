import type { Claim, PublicObservation } from "@wachuma/shared";

export interface DarwinCoreOccurrenceInput {
  occurrenceId: string;
  scientificName: string;
  eventDate: string;
  basisOfRecord: "HumanObservation" | "MachineObservation" | "MaterialEntity";
  decimalLatitude?: number;
  decimalLongitude?: number;
  coordinateUncertaintyInMeters?: number;
  locality?: string;
  occurrenceStatus?: "present" | "absent";
  license?: string;
  rightsHolder?: string;
  informationWithheld?: string;
}

export type DarwinCoreOccurrence = Record<string, string | number>;

export function toDarwinCoreOccurrence(
  input: DarwinCoreOccurrenceInput,
): DarwinCoreOccurrence {
  const occurrence: DarwinCoreOccurrence = {
    occurrenceID: input.occurrenceId,
    scientificName: input.scientificName,
    eventDate: input.eventDate,
    basisOfRecord: input.basisOfRecord,
  };
  if (input.decimalLatitude !== undefined) {
    occurrence.decimalLatitude = input.decimalLatitude;
  }
  if (input.decimalLongitude !== undefined) {
    occurrence.decimalLongitude = input.decimalLongitude;
  }
  if (input.coordinateUncertaintyInMeters !== undefined) {
    occurrence.coordinateUncertaintyInMeters =
      input.coordinateUncertaintyInMeters;
  }
  if (input.locality) occurrence.locality = input.locality;
  if (input.occurrenceStatus)
    occurrence.occurrenceStatus = input.occurrenceStatus;
  if (input.license) occurrence.license = input.license;
  if (input.rightsHolder) occurrence.rightsHolder = input.rightsHolder;
  if (input.informationWithheld) {
    occurrence.informationWithheld = input.informationWithheld;
  }
  return occurrence;
}

export interface JsonLdNode {
  "@id": string;
  "@type"?: string;
  [key: string]: unknown;
}

export interface RoCrateLike {
  "@context": string;
  "@graph": JsonLdNode[];
}

export interface RoCrateEntity {
  id: string;
  type: string;
  name?: string;
  sourceUrl?: string;
  license?: string;
  attribution?: string;
  derivedFrom?: string[];
  generatedAtTime?: string;
}

export function buildRoCrateMetadata(
  root: RoCrateEntity,
  entities: RoCrateEntity[] = [],
): RoCrateLike {
  const toNode = (entity: RoCrateEntity): JsonLdNode => ({
    "@id": entity.id,
    "@type": entity.type,
    ...(entity.name ? { name: entity.name } : {}),
    ...(entity.sourceUrl ? { url: entity.sourceUrl } : {}),
    ...(entity.license ? { license: entity.license } : {}),
    ...(entity.attribution ? { attribution: entity.attribution } : {}),
    ...(entity.derivedFrom
      ? {
          "prov:wasDerivedFrom": entity.derivedFrom.map((id) => ({
            "@id": id,
          })),
        }
      : {}),
    ...(entity.generatedAtTime
      ? { "prov:generatedAtTime": entity.generatedAtTime }
      : {}),
  });
  return {
    "@context": "https://w3id.org/ro/crate/1.2/context",
    "@graph": [
      {
        "@id": "ro-crate-metadata.json",
        "@type": "CreativeWork",
        about: { "@id": root.id },
      },
      toNode(root),
      ...entities.map(toNode),
    ],
  };
}

export function claimToJsonLd(claim: Claim): JsonLdNode {
  const node: JsonLdNode = {
    "@id": claim.publicId,
    "@type": "wachuma:Claim",
    "wachuma:subject": { "@id": claim.subjectId },
    "wachuma:predicate": claim.predicate,
    "wachuma:assertionType": claim.assertionType,
    "wachuma:evidenceLevel": claim.evidenceLevel,
    "prov:wasAttributedTo": claim.authorAgentId
      ? { "@id": claim.authorAgentId }
      : undefined,
    "prov:wasDerivedFrom": { "@id": claim.sourceId },
  };
  if (claim.objectId) node["wachuma:object"] = { "@id": claim.objectId };
  if (claim.objectUri) node["wachuma:object"] = claim.objectUri;
  if (claim.objectText) node["wachuma:object"] = claim.objectText;
  if (claim.value) node["wachuma:value"] = claim.value;
  return node;
}

export function observationToDarwinCore(
  observation: PublicObservation,
  scientificName: string,
): DarwinCoreOccurrence {
  const coordinates = observation.geometryPublic as
    { coordinates?: [number, number] } | undefined;
  const [longitude, latitude] = coordinates?.coordinates ?? [];
  return toDarwinCoreOccurrence({
    occurrenceId: observation.publicId,
    scientificName,
    eventDate: observation.observedAt,
    basisOfRecord:
      observation.observationBasis === "external"
        ? "MachineObservation"
        : observation.observationBasis === "specimen"
          ? "MaterialEntity"
          : "HumanObservation",
    ...(typeof latitude === "number" ? { decimalLatitude: latitude } : {}),
    ...(typeof longitude === "number" ? { decimalLongitude: longitude } : {}),
    ...(observation.placeName ? { locality: observation.placeName } : {}),
    informationWithheld:
      "Exact geometry withheld by WACHUMA publication policy",
  });
}
