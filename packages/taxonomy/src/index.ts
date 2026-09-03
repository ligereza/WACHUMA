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
      publicId: "source-utn-echinopsis-pachanoi-habitat-2017",
      title:
        "Modelación de la distribución geográfica del hábitat del cactus Echinopsis pachanoi en el norte de los Andes Ecuatorianos",
      citation:
        "Tituaña Armas, M. L. (2017). Modelación de la distribución geográfica del hábitat del cactus Echinopsis pachanoi (Britton y Rose) Friedrich y G.D. Rowley, en el norte de los Andes Ecuatorianos. Tesis de maestría, Universidad Técnica del Norte. Publicada el 13 de noviembre de 2017.",
      url: "https://repositorio.utn.edu.ec/handle/123456789/7458?locale=es",
      sourceType: "scientific_publication",
      license: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
      attribution:
        "Tituaña Armas, Magaly Lisseth; Universidad Técnica del Norte",
      publishedOn: "2017-11-13",
      accessedAt: "2026-08-27T23:33:16.979Z",
      assertionType: "academic_publication",
    },
    {
      publicId: "source-wachuma-demo-editorial",
      title: "WACHUMA · fixture de verificación",
      citation:
        "Fixture interno de verificación del repositorio WACHUMA; no forma parte del corpus público.",
      url: "https://github.com/ligereza/WACHUMA",
      sourceType: "editorial",
      license: "WACHUMA-PROJECT",
      attribution: "WACHUMA; fixture no publicable",
      accessedAt: "2026-08-23T00:00:00Z",
      assertionType: "editorial_interpretation",
    },
    {
      publicId: "source-unprg-echinopsis-pachanoi-rhizosphere-2023",
      title:
        "Bacillus spp. y Pseudomonas spp. aisladas de la rizósfera de Echinopsis pachanoi “San Pedro hembra” en Lambayeque",
      citation:
        "Núñez Montenegro, A. T. (2023). Bacillus spp. y Pseudomonas spp. aisladas de la rizósfera de Echinopsis pachanoi “San Pedro hembra” en Lambayeque como potenciales promotores de crecimiento de Solanum lycopersicum L. bajo estrés hídrico. Tesis, Universidad Nacional Pedro Ruiz Gallo.",
      url: "https://repositorio.unprg.edu.pe/handle/20.500.12893/11487?show=full",
      sourceType: "scientific_publication",
      license: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution:
        "Núñez Montenegro, Angiela Tatiana; Universidad Nacional Pedro Ruiz Gallo",
      publishedOn: "2023-06-05",
      accessedAt: "2026-08-27T23:33:16.979Z",
      assertionType: "academic_publication",
    },
    {
      publicId: "source-untumbes-echinopsis-metabolomics-2020",
      title:
        "Caracterización genómica, proteómica y metabolómica de Hylocereus spp y Echinopsis spp (Cactaceae)",
      citation:
        "Chang Coronado, R. M. (2020). Caracterización genómica, proteómica y metabolómica de Hylocereus spp y Echinopsis spp (Cactaceae). Tesis, Universidad Nacional de Tumbes.",
      url: "https://repositorio.untumbes.edu.pe/items/b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
      sourceType: "scientific_publication",
      license: "https://creativecommons.org/licenses/by/4.0/",
      attribution:
        "Chang Coronado, Rosita Mercedes; Universidad Nacional de Tumbes",
      accessedAt: "2026-08-27T23:33:16.979Z",
      assertionType: "academic_publication",
    },
    {
      publicId: "source-scielo-echinopsis-pachanoi-rhizosphere-2025",
      title:
        "Consorcios Bacterianos con Actividad Promotora del Crecimiento Asociados a la Rizosfera de Echinopsis pachanoi",
      citation:
        "Cedeño-Moreira, A. V., Arellano-Ibarra, K. V., Álvarez-Sánchez, A. R., Espinoza-Guerra, Í. F., Acosta-Farias, J. M. & Pico-Saltos, R. B. (2025). Consorcios Bacterianos con Actividad Promotora del Crecimiento Asociados a la Rizosfera de Echinopsis pachanoi. Terra Latinoamericana, 43. DOI: 10.28940/terra.v43i.1976.",
      url: "https://www.scielo.org.mx/scielo.php?lng=es&nrm=iso&pid=S0187-57792025000100601&script=sci_arttext",
      sourceType: "scientific_publication",
      license: "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.es",
      attribution:
        "Cedeño-Moreira, Arellano-Ibarra, Álvarez-Sánchez, Espinoza-Guerra, Acosta-Farias y Pico-Saltos; Terra Latinoamericana",
      doi: "10.28940/terra.v43i.1976",
      publishedOn: "2025-12-01",
      accessedAt: "2026-08-27T23:33:16.979Z",
      assertionType: "academic_publication",
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
      accessedAt: "2026-08-23T00:00:00Z",
      assertionType: "taxonomic_fact",
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
      accessedAt: "2026-08-23T00:00:00Z",
      assertionType: "taxonomic_fact",
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
      doi: "10.1186/1746-4269-10-26",
      publishedOn: "2014-02-24",
      accessedAt: "2026-08-23T00:00:00Z",
      assertionType: "academic_publication",
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
      accessedAt: "2026-08-23T00:00:00Z",
      assertionType: "horticultural_guidance",
    },
  ],
  relatedSpecies: [],
} as unknown as SpeciesDocument;

export type { SpeciesDocument } from "@wachuma/shared";
