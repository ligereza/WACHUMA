import type { GrowingGuide, PublicCultivationEvent } from "@wachuma/shared";

export const demoGrowingGuide = {
  id: "guide-echinopsis-pachanoi-demo-v1",
  guideKey: "echinopsis-pachanoi-demo",
  publicId: "guide-echinopsis-pachanoi-demo-v1",
  version: 1,
  title: "Guía de demostración · Echinopsis pachanoi",
  biologicalEntityId: "biological-entity-echinopsis-pachanoi",
  subjectPublicId: "biological-entity-echinopsis-pachanoi",
  climateContext: "Pendiente de definir con fuentes y región",
  techniqueContext: "Documento estructurado de prueba",
  regionContext: "No especificada",
  status: "published",
  summary:
    "Documento público de demostración del esquema. No presenta recomendaciones de cultivo sin bibliografía verificable.",
  claims: [
    {
      id: "claim-echinopsis-propagation-demo",
      sectionKey: "propagation",
      statement:
        "Pendiente de documentar métodos de propagación con una fuente verificable y contexto regional.",
      evidenceLevel: "unverified",
      sourceId: "source-wachuma-demo-editorial",
      assertionType: "editorial_interpretation",
    },
    {
      id: "claim-echinopsis-substrate-demo",
      sectionKey: "substrate",
      statement:
        "Pendiente de documentar sustrato, drenaje y condiciones de cultivo; no es una recomendación publicada.",
      evidenceLevel: "unverified",
      sourceId: "source-wachuma-demo-editorial",
      assertionType: "editorial_interpretation",
    },
    {
      id: "claim-echinopsis-observation-demo",
      sectionKey: "observations",
      statement:
        "Registrar aquí observaciones contemporáneas fechadas del jardín, separadas de la bibliografía.",
      evidenceLevel: "reported",
      sourceId: "source-wachuma-demo-editorial",
      assertionType: "contemporary_observation",
    },
  ],
} as unknown as GrowingGuide;

export type { GrowingGuide } from "@wachuma/shared";

export const demoCultivationEvents: PublicCultivationEvent[] = [
  {
    id: "cultivation-event-public-demo-01" as PublicCultivationEvent["id"],
    specimenPublicId:
      "specimen-public-demo-01" as PublicCultivationEvent["specimenPublicId"],
    eventType: "observation",
    occurredAt: "2026-08-01T12:00:00.000Z",
    notes:
      "Observación contemporánea sintética del fixture; no es una recomendación de cultivo.",
    measurements: { source: "synthetic-fixture" },
  },
];

export type { CultivationEvent, PublicCultivationEvent } from "@wachuma/shared";
