import type { SpeciesDocument } from "@wachuma/shared";

export const demoSpeciesDocument = {
  id: "taxon-echinopsis-pachanoi",
  publicId: "biological-entity-echinopsis-pachanoi",
  scientificName: "Echinopsis pachanoi",
  displayName: "Echinopsis pachanoi",
  rank: "species",
  taxonomicStatus: "accepted",
  entityType: "species",
  taxonId: "taxon-echinopsis-pachanoi",
  taxonomicVariants: [
    {
      name: "Trichocereus pachanoi",
      relationType: "historical_combination",
      context:
        "Combinación taxonómica histórica conservada como variante documentada; no se usa para resolver nombres culturales ni sustituye una sincronización taxonómica revisada.",
      sourcePublicId: "source-wachuma-demo-editorial",
      reviewStatus: "draft",
    },
  ],
  visibility: "public",
  externalIdentifiers: [],
  description:
    "Ficha de demostración del modelo. La sincronización con proveedores externos y la revisión taxonómica editorial son fases posteriores.",
  ecology: [
    "La ecología de esta ficha queda pendiente de una fuente taxonómica o ecológica verificable; el fixture no inventa rangos ni preferencias ambientales.",
  ],
  distribution: [
    {
      placePublicId: "place-demo-public",
      label: "Región aproximada sintética del fixture",
      geometry: { type: "Point", coordinates: [-70.65, -33.45] },
      sourcePublicId: "source-wachuma-demo-editorial",
    },
  ],
  cultivation: [
    "La guía publicada asociada es estructural y explícitamente no contiene recomendaciones sin bibliografía verificable.",
  ],
  vernacularNames: [
    {
      term: "wachuma",
      relationType: "vernacular_name",
      context:
        "Nombre cultural contextualizado; no se trata como equivalencia taxonómica automática.",
      sourcePublicId: "source-wachuma-demo-editorial",
      accessLevel: "public",
      reviewStatus: "draft",
    },
    {
      term: "huachuma",
      relationType: "vernacular_name",
      context:
        "Variante ortográfica documentada como concepto cultural; no se trata como equivalencia taxonómica automática.",
      sourcePublicId: "source-wachuma-demo-editorial",
      accessLevel: "public",
      reviewStatus: "draft",
    },
    {
      term: "San Pedro",
      relationType: "vernacular_name",
      context:
        "Nombre cultural contextualizado; no se trata como equivalencia taxonómica absoluta.",
      sourcePublicId: "source-wachuma-demo-editorial",
      accessLevel: "public",
      reviewStatus: "draft",
    },
  ],
  culturalRelations: [],
  history: [
    "No hay una afirmación histórica publicada en este fixture; las variantes taxonómicas y nombres culturales conservan su propio estado de revisión.",
  ],
  sources: [
    {
      publicId: "source-wachuma-demo-editorial",
      title: "WACHUMA · ficha de demostración",
      citation: "Contenido editorial de demostración del repositorio WACHUMA",
      url: "https://github.com/ligereza/WACHUMA",
      license: "WACHUMA-PROJECT",
      attribution: "WACHUMA",
      assertionType: "editorial_interpretation",
    },
  ],
  relatedSpecies: [],
  media: [
    {
      uri: "/models/echinopsis-pachanoi-demo.glb",
      title: "Representación procedural 3D · no taxonómica",
      license: "WACHUMA-PROJECT",
      attribution: "Generador parametric-cactus propio de WACHUMA",
    },
  ],
} as unknown as SpeciesDocument;

export type { SpeciesDocument } from "@wachuma/shared";
