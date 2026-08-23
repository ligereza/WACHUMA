import type { PublicObservation, SpecimenRecord } from "@wachuma/shared";

/** Synthetic public fixture with no exact location or real-world identity. */
export const demoPublicSpecimen = {
  id: "specimen-public-demo-01",
  publicId: "specimen-public-demo-01",
  specimenType: "plant-live",
  biologicalEntityId: "biological-entity-echinopsis-pachanoi",
  biologicalEntityPublicId: "biological-entity-echinopsis-pachanoi",
  biologicalEntityType: "species",
  status: "alive",
  visibility: "public",
  qrUrl: "https://wachuma.org/specimens/specimen-public-demo-01",
} as unknown as SpecimenRecord;

export const demoPublicObservations = [
  {
    publicId: "observation-demo-public-01",
    subjectPublicId: "biological-entity-echinopsis-pachanoi",
    observedAt: "2026-01-15T12:00:00.000Z",
    observationBasis: "human",
    placePublicId: "place-demo-public",
    placeName: "Jardín demo · región aproximada",
    geometryPublic: {
      type: "Point",
      coordinates: [-70.65, -33.45],
    },
    environment: { synthetic: true, context: "fixture-demo" },
  },
] as unknown as PublicObservation[];

export type { SpecimenRecord } from "@wachuma/shared";
