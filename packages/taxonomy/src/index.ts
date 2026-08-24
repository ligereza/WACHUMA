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
      sourcePublicId: "source-gbif-echinopsis-pachanoi",
      reviewStatus: "draft",
    },
  ],
  visibility: "public",
  externalIdentifiers: [
    {
      namespace: "ipni",
      identifier: "88444-2",
      canonicalUrl: "https://www.ipni.org/n/88444-2",
    },
    {
      namespace: "gbif",
      identifier: "5622352",
      canonicalUrl: "https://www.gbif.org/species/5622352",
    },
    {
      namespace: "gbif",
      identifier: "11093098",
      canonicalUrl: "https://www.gbif.org/species/11093098",
    },
  ],
  description:
    "Ficha pública inicial anclada a POWO/Kew y GBIF. Conserva la diferencia entre una especie aceptada en POWO, una coincidencia GBIF con estado sinónimo y los nombres culturales documentados en contextos específicos.",
  ecology: [
    "POWO indica un rango nativo desde el sur de Ecuador hasta Perú.",
    "POWO vincula la especie con un bioma tropical estacionalmente seco; la ficha conserva esta afirmación como claim de fuente y no como descripción exhaustiva de toda su ecología.",
    "No se publica una geometría de distribución en esta primera ficha hasta revisar ocurrencias y resolución geográfica por registro.",
  ],
  distribution: [
    {
      label: "Sur de Ecuador a Perú · rango indicado por POWO",
      sourcePublicId: "source-powo-echinopsis-pachanoi",
    },
  ],
  cultivation: [
    "La guía RHS asociada ofrece orientación general para cactáceas y suculentas en contenedor; conserva su contexto británico y no se presenta como protocolo regional específico.",
  ],
  vernacularNames: [
    {
      term: "wachuma",
      relationType: "vernacular_name",
      context:
        "Nombre cultural pendiente de una fuente y contexto comunitario específico; no se trata como equivalencia taxonómica automática.",
      sourcePublicId: "source-wachuma-demo-editorial",
      accessLevel: "restricted",
      reviewStatus: "draft",
    },
    {
      term: "huachuma",
      relationType: "vernacular_name",
      context:
        "Variante ortográfica pendiente de una fuente y contexto comunitario específico; no se trata como equivalencia taxonómica automática.",
      sourcePublicId: "source-wachuma-demo-editorial",
      accessLevel: "restricted",
      reviewStatus: "draft",
    },
    {
      term: "San Pedro",
      relationType: "vernacular_name",
      context:
        "El estudio de Armijos, Cota y González registra este nombre para Echinopsis pachanoi en entrevistas con yachakkuna Saraguro; se conserva como relación situada y no como equivalencia taxonómica absoluta.",
      sourcePublicId: "source-armijos-saraguro-yachakkuna-2014",
      accessLevel: "restricted",
      reviewStatus: "under-review",
    },
  ],
  culturalRelations: [],
  history: [
    "Los nombres culturales y la historia de uso se mantienen separados de la taxonomía; el registro situado de San Pedro permanece restringido hasta revisión comunitaria.",
  ],
  sources: [
    {
      publicId: "source-wachuma-demo-editorial",
      title: "WACHUMA · ficha de demostración",
      citation: "Contenido editorial de demostración del repositorio WACHUMA",
      url: "https://github.com/ligereza/WACHUMA",
      sourceType: "editorial",
      license: "WACHUMA-PROJECT",
      attribution: "WACHUMA",
    },
    {
      publicId: "source-powo-echinopsis-pachanoi",
      title: "Plants of the World Online · Echinopsis pachanoi",
      citation:
        "POWO (2026), Plants of the World Online. Facilitated by the Royal Botanic Gardens, Kew. Consultado el 23 de agosto de 2026.",
      url: "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:88444-2/general-information",
      sourceType: "external_dataset",
      license: "CC BY 3.0",
      attribution: "Plants of the World Online; Royal Botanic Gardens, Kew",
    },
    {
      publicId: "source-gbif-echinopsis-pachanoi",
      title: "GBIF Backbone Taxonomy · Echinopsis pachanoi",
      citation:
        "GBIF Secretariat. GBIF Backbone Taxonomy. Match API y ficha taxonómica consultados el 23 de agosto de 2026.",
      url: "https://www.gbif.org/species/5622352",
      sourceType: "external_dataset",
      license: "CC BY 4.0",
      attribution: "GBIF Secretariat; GBIF Backbone Taxonomy",
    },
    {
      publicId: "source-armijos-saraguro-yachakkuna-2014",
      title: "Traditional medicine applied by the Saraguro yachakkuna",
      citation:
        "Armijos, C., Cota, I. & González, S. (2014). Journal of Ethnobiology and Ethnomedicine, 10, 26. DOI: 10.1186/1746-4269-10-26.",
      url: "https://link.springer.com/article/10.1186/1746-4269-10-26",
      sourceType: "scientific_publication",
      license: "CC BY 2.0",
      attribution:
        "Armijos, C.; Cota, I.; González, S.; licenciatario BioMed Central",
    },
    {
      publicId: "source-rhs-cacti-succulents-guide",
      title: "RHS · How to grow houseplant cacti and succulents",
      citation:
        "Royal Horticultural Society. How to grow houseplant cacti and succulents. Consultado el 23 de agosto de 2026.",
      url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide",
      sourceType: "horticultural_guide",
      license: "RHS-TERMS",
      attribution:
        "Royal Horticultural Society; WACHUMA cita esta guía como orientación general para cactáceas y conserva su alcance institucional.",
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
