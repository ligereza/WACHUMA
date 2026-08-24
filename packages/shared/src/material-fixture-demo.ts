import type { Id, PublicId } from "./types.js";
import { createMaterialFixture } from "./material-fixture.js";

/**
 * Browser/API verification fallback only. The production API reads the
 * persisted public fixture from PostgreSQL; this record is intentionally
 * labelled as an editorial procedural interpretation.
 */
export const demoMaterialFixture = createMaterialFixture({
  publicId: "material-study-echinopsis-pachanoi" as PublicId,
  biologicalEntityId: "biological-entity-echinopsis-pachanoi" as Id,
  representationType: "procedural-interpretation",
  growthStage: "adulto · lectura editorial de forma y cultivo",
  material: {
    baseColor: "#86a77b",
    roughness: 0.68,
    metallic: 0,
    transmission: 0.06,
    ior: 1.38,
    emissiveColor: "#d5e9c2",
    emissiveStrength: 0.12,
  },
  bindings: [
    {
      id: "material-binding-echinopsis-morphology" as PublicId,
      layer: "morphology",
      target: "geometry",
      interpretation: "symbolic",
      claimIds: [],
      sourceIds: ["source-wachuma-material-fixture" as Id],
      sourcePublicIds: ["source-wachuma-material-fixture" as PublicId],
      notes:
        "La geometría puede evocar un cactus columnar; no sustituye una descripción morfológica ni una captura de ejemplar.",
    },
    {
      id: "material-binding-echinopsis-cultivation" as PublicId,
      layer: "cultivation",
      target: "animation",
      interpretation: "symbolic",
      claimIds: [],
      sourceIds: ["source-wachuma-material-fixture" as Id],
      sourcePublicIds: ["source-wachuma-material-fixture" as PublicId],
      notes:
        "La animación queda reservada para representar etapas del manual de cultivo cuando existan datos de ejemplares.",
    },
  ],
  notes:
    "Estudio material procedural. Sus valores PBR son parámetros visuales y no representan composición química, reflectancia medida ni una reconstrucción científica.",
  visibility: "public",
});
