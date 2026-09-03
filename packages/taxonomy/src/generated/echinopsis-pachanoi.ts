// GENERATED FILE - do not edit by hand.
// Source: content/species/echinopsis-pachanoi.json
// Regenerate: pnpm content:taxonomy-fixture
// Drift gate: pnpm quality:taxonomy-fixture

export const editorialSpeciesDocument = {
  $schema: "https://wachuma.org/schemas/species-document.schema.json",
  schemaVersion: "1.0",
  publicId: "biological-entity-echinopsis-pachanoi",
  scientificName: "Echinopsis pachanoi",
  rank: "species",
  taxonomicStatus: "accepted",
  entityType: "species",
  authorityNote:
    "Entidad editorial anclada a fuentes taxonómicas externas; no equipara nombres culturales con el taxón.",
  visibility: "public",
  description:
    "Ficha pública inicial anclada a POWO/Kew y GBIF. Conserva la diferencia entre una especie aceptada en POWO, una coincidencia GBIF con estado sinónimo y los nombres culturales documentados en contextos específicos.",
  claims: [
    {
      publicId: "claim-utn-echinopsis-pachanoi-habitat-model-2017",
      predicate: "distributionModel",
      statement:
        "La tesis de Tituaña Armas modeló la distribución potencial del hábitat de Echinopsis pachanoi en el norte de los Andes ecuatorianos a partir de 63 hallazgos y variables bioclimáticas; reportó la precipitación media anual y la vegetación como variables relevantes para el modelo y delimitó un área potencial de 459,64 km² para manejo.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-utn-echinopsis-pachanoi-habitat-2017",
      sourceRecordId: "utn-handle:123456789/7458",
      authorPerspective:
        "Tituaña Armas y Universidad Técnica del Norte; paráfrasis editorial de WACHUMA, sin convertir el modelo potencial en una distribución confirmada.",
      recordedOn: "2017-11-13",
      visibility: "public",
      reviewStatus: "under-review",
    },
    {
      publicId: "claim-unprg-echinopsis-pachanoi-rhizosphere-2023",
      predicate: "rhizosphereStudy",
      statement:
        "La tesis de Núñez Montenegro estudió aislamientos de Bacillus spp. y Pseudomonas spp. de la rizosfera de Echinopsis pachanoi “San Pedro hembra” en Lambayeque y evaluó su potencial promotor del crecimiento en Solanum lycopersicum bajo estrés hídrico. No constituye una guía de cultivo del cactus ni demuestra que esos consorcios sean un requisito de la especie.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-unprg-echinopsis-pachanoi-rhizosphere-2023",
      sourceRecordId: "unprg-handle:20.500.12893/11487",
      authorPerspective:
        "Núñez Montenegro y Universidad Nacional Pedro Ruiz Gallo; paráfrasis editorial acotada al resumen del registro y separada de recomendaciones de cultivo.",
      recordedOn: "2026-08-27",
      visibility: "public",
      reviewStatus: "under-review",
    },
    {
      publicId: "claim-scielo-echinopsis-pachanoi-rhizosphere-2025",
      predicate: "rhizosphereStudy",
      statement:
        "El artículo de Cedeño-Moreira y colaboradores estudia consorcios bacterianos con actividad promotora del crecimiento asociados a la rizosfera de Echinopsis pachanoi. WACHUMA lo registra como investigación de microbiología vegetal, no como evidencia suficiente para prescribir una práctica de cultivo.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-scielo-echinopsis-pachanoi-rhizosphere-2025",
      sourceRecordId: "scielo-pid:S0187-57792025000100601",
      authorPerspective:
        "Cedeño-Moreira, Arellano-Ibarra, Álvarez-Sánchez, Espinoza-Guerra, Acosta-Farias y Pico-Saltos; paráfrasis editorial del título y metadatos del artículo.",
      recordedOn: "2026-08-27",
      visibility: "public",
      reviewStatus: "under-review",
    },
    {
      publicId: "claim-untumbes-echinopsis-metabolomics-2020",
      predicate: "chemicalProfileStudy",
      statement:
        "La tesis de Chang Coronado caracteriza Hylocereus y Echinopsis mediante marcadores ITS2, proteómica y metabolómica; el registro incluye Echinopsis pachanoi y especies cercanas y reporta perfiles MS/MS de mescalina para cuatro especies de Echinopsis. Es evidencia de un estudio analítico concreto, no una composición universal ni una recomendación de consumo.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-untumbes-echinopsis-metabolomics-2020",
      sourceRecordId: "untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
      authorPerspective:
        "Chang Coronado y Universidad Nacional de Tumbes; paráfrasis editorial del registro de tesis, con alcance limitado a las muestras y métodos descritos por la autora.",
      recordedOn: "2026-08-27",
      visibility: "public",
      reviewStatus: "under-review",
    },
    {
      publicId: "claim-powo-echinopsis-pachanoi-accepted",
      predicate: "taxonomicStatus",
      statement:
        "POWO registra Echinopsis pachanoi como especie aceptada; su rango nativo se indica desde el sur de Ecuador hasta Perú.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-powo-echinopsis-pachanoi",
      sourceRecordId: "taxon:88444-2",
      authorPerspective:
        "Plants of the World Online; lectura editorial de WACHUMA.",
      recordedOn: "2026-08-23",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-gbif-echinopsis-pachanoi-name-match",
      predicate: "gbifNameMatch",
      statement:
        "GBIF Backbone devuelve una coincidencia exacta para Echinopsis pachanoi, con estado SYNONYM y acceptedUsageKey 11093098.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-gbif-echinopsis-pachanoi",
      sourceRecordId: "species:5622352",
      authorPerspective:
        "GBIF Backbone Taxonomy; se conserva la diferencia con la evaluación editorial de POWO.",
      recordedOn: "2026-08-23",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-echinopsis-pachanoi-historical-combination",
      predicate: "historicalContext",
      statement:
        "WACHUMA conserva Trichocereus pachanoi como combinación taxonómica histórica relacionada con la ficha de Echinopsis pachanoi; no la utiliza para resolver nombres culturales ni como equivalencia taxonómica absoluta.",
      assertionType: "editorial_interpretation",
      evidenceLevel: "documented",
      sourcePublicId: "source-gbif-echinopsis-pachanoi",
      sourceRecordId: "species:5622352",
      authorPerspective:
        "Interpretación editorial de WACHUMA basada en la coincidencia taxonómica de GBIF Backbone; la perspectiva se conserva separada del proveedor.",
      recordedOn: "2026-08-23",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-powo-echinopsis-pachanoi-native-range",
      predicate: "nativeRange",
      statement:
        "Plants of the World Online indica un rango nativo desde el sur de Ecuador hasta Perú.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-powo-echinopsis-pachanoi",
      sourceRecordId: "taxon:88444-2",
      authorPerspective:
        "Plants of the World Online; lectura editorial de WACHUMA.",
      recordedOn: "2026-08-23",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-powo-echinopsis-pachanoi-biome",
      predicate: "biome",
      statement:
        "Plants of the World Online vincula la especie con un bioma tropical estacionalmente seco.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-powo-echinopsis-pachanoi",
      sourceRecordId: "taxon:88444-2",
      authorPerspective:
        "Plants of the World Online; lectura editorial de WACHUMA.",
      recordedOn: "2026-08-23",
      visibility: "public",
      reviewStatus: "accepted",
    },
  ],
  externalIdentifiers: [
    {
      namespace: "ipni",
      identifier: "88444-2",
      canonicalUrl: "https://www.ipni.org/n/88444-2",
      license: "CC BY 3.0",
    },
    {
      namespace: "gbif",
      identifier: "5622352",
      canonicalUrl: "https://www.gbif.org/species/5622352",
      license: "CC BY 4.0",
    },
    {
      namespace: "gbif",
      identifier: "11093098",
      canonicalUrl: "https://www.gbif.org/species/11093098",
      license: "CC BY 4.0",
    },
  ],
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
  history: [
    "Los nombres culturales y la historia de uso se mantienen separados de la taxonomía; el registro situado de San Pedro permanece restringido hasta revisión comunitaria.",
  ],
  relatedSpecies: [],
  culturalRelations: [],
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
  vernacularNames: [
    {
      term: "San Pedro",
      context:
        "El estudio de Armijos, Cota y González registra este nombre para Echinopsis pachanoi en entrevistas con yachakkuna Saraguro; se conserva como relación situada y no como equivalencia taxonómica absoluta.",
      sourcePublicId: "source-armijos-saraguro-yachakkuna-2014",
      accessLevel: "restricted",
      reviewStatus: "under-review",
    },
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
};
