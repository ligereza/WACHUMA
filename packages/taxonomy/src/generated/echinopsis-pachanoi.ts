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
  taxonomicStatus: "unresolved",
  entityType: "species",
  authorityNote:
    "Entidad editorial anclada a fuentes taxonómicas externas; no equipara nombres culturales con el taxón.",
  visibility: "public",
  description:
    "Ficha pública anclada a fuentes taxonómicas externas. Conserva sin resolver la diferencia entre el tratamiento de POWO, que acepta Echinopsis pachanoi como especie, y el de Albesiano y Kiesling (2012), que la trata como Trichocereus macrogonus var. pachanoi; también mantiene separados los nombres culturales documentados en contextos específicos.",
  claims: [
    {
      publicId: "claim-ipni-echinopsis-pachanoi-protologue-1920",
      predicate: "historicalTaxonomy",
      statement:
        "IPNI registra que el nombre fue publicado originalmente como Trichocereus pachanoi por Britton y Rose el 9 de septiembre de 1920, en The Cactaceae 2:134–135; el registro nomenclatural cita material recolectado por J. N. Rose, A. Pachano y George Rose cerca de Cuenca y un holotipo en NY.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-ipni-trichocereus-pachanoi-1920",
      sourceRecordId: "ipni:name:257116-2",
      authorPerspective:
        "IPNI; WACHUMA resume el registro nomenclatural y no convierte el material tipo en una descripción de todos los ejemplares actuales.",
      recordedOn: "2026-09-05",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-ipni-echinopsis-pachanoi-combinations",
      predicate: "historicalTaxonomy",
      statement:
        "La historia nomenclatural incluye la combinación Cereus pachanoi (1931) y la combinación Echinopsis pachanoi de 1974; POWO trata Trichocereus pachanoi como sinónimo de Echinopsis pachanoi en su backbone actual.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-ipni-trichocereus-pachanoi-1920",
      sourceRecordId: "ipni:name:257116-2",
      authorPerspective:
        "IPNI y POWO mantienen los actos nomenclaturales separados de la decisión editorial sobre el nombre aceptado.",
      recordedOn: "2026-09-05",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-schlumpberger-renner-echinopsis-plastid-2012",
      predicate: "molecularPhylogeny",
      statement:
        "Schlumpberger y Renner analizaron 3.800 nucleótidos de ADN del cloroplasto en 162 plantas que representaban 144 especies y subespecies. Su filogenia de máxima verosimilitud encontró que Echinopsis sensu lato no era monofilético y que la forma de crecimiento y el modo de polinización eran caracteres evolutivamente lábiles. Este resultado informa la historia de clasificación del grupo; no es un genoma de referencia ni identifica por sí solo un clon de Echinopsis pachanoi.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-schlumpberger-renner-echinopsis-2012",
      sourceRecordId: "doi:10.3732/ajb.1100288",
      authorPerspective:
        "Schlumpberger y Renner; WACHUMA conserva el alcance del muestreo y evita presentarlo como una prueba de identidad individual.",
      recordedOn: "2026-09-05",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-albesiano-terrazas-trichocereus-chloroplast-2012",
      predicate: "chloroplastPhylogeny",
      statement:
        "Albesiano y Terrazas combinaron 39 caracteres exomorfológicos con secuencias de los marcadores de cloroplasto trnL-F y rpl16 en un muestreo que incluyó 17 especies de Trichocereus y géneros relacionados. Su análisis recuperó Trichocereus como monofilético bajo una circunscripción que incluía dos especies de Harrisia, una hipótesis que difiere de otros tratamientos amplios de Echinopsis.",
      assertionType: "academic_publication",
      evidenceLevel: "documented",
      sourcePublicId: "source-albesiano-terrazas-trichocereus-2012",
      sourceRecordId: "haseltonia:17:3-23",
      authorPerspective:
        "Albesiano y Terrazas; WACHUMA presenta esta hipótesis junto a la evidencia plastídica alternativa y no fuerza una resolución taxonómica única.",
      recordedOn: "2026-09-05",
      visibility: "public",
      reviewStatus: "accepted",
    },
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
        "Plants of the World Online (POWO) acepta Echinopsis pachanoi como especie y lista Trichocereus macrogonus var. pachanoi como sinónimo. WACHUMA conserva esta postura sin usarla para resolver el tratamiento alternativo de Albesiano y Kiesling.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-powo-echinopsis-pachanoi",
      sourceRecordId: "taxon:88444-2",
      authorPerspective:
        "Plants of the World Online, Royal Botanic Gardens, Kew; WACHUMA conserva esta postura como la evaluación de ese proveedor.",
      recordedOn: "2026-08-23",
      visibility: "public",
      reviewStatus: "accepted",
    },
    {
      publicId: "claim-albesiano-kiesling-macrogonus-pachanoi-2012",
      predicate: "taxonomicStatus",
      statement:
        "Albesiano y Kiesling (2012) presentaron Trichocereus pachanoi como variedad de Trichocereus macrogonus y establecieron Trichocereus macrogonus var. pachanoi (Britton & Rose) S.Albesiano & R.Kiesling, comb. et stat. nov. Este tratamiento nomenclatural no identifica por sí solo ejemplares ni resuelve la postura distinta de POWO.",
      assertionType: "taxonomic_fact",
      evidenceLevel: "documented",
      sourcePublicId: "source-albesiano-kiesling-macrogonus-2012",
      sourceRecordId: "doi:10.2985/1070-0048-17.1.3",
      authorPerspective:
        "Sofía Albesiano y Roberto Kiesling; WACHUMA conserva este tratamiento de 2012 junto a la postura de POWO, sin fundirlas.",
      recordedOn: "2012-03-31",
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
      namespace: "ipni",
      identifier: "77125731-1",
      canonicalUrl: "https://www.ipni.org/n/77125731-1",
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
    {
      name: "Trichocereus macrogonus var. pachanoi",
      relationType: "unresolved_variant",
      context:
        "Tratamiento de Albesiano y Kiesling (2012), conservado junto a la aceptación de Echinopsis pachanoi en POWO; WACHUMA no lo promueve como una resolución taxonómica propia.",
      sourcePublicId: "source-albesiano-kiesling-macrogonus-2012",
      reviewStatus: "under-review",
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
      publicId: "source-ipni-trichocereus-pachanoi-1920",
      title: "IPNI · Trichocereus pachanoi Britton & Rose",
      citation:
        "International Plant Names Index. Trichocereus pachanoi Britton & Rose, The Cactaceae 2:134–135 (1920), nomenclatural record 257116-2. Consultado el 5 de septiembre de 2026.",
      url: "https://www.ipni.org/n/257116-2",
      sourceType: "historical_account",
      license: "CC BY 3.0",
      attribution:
        "International Plant Names Index; Royal Botanic Gardens, Kew, Harvard University Herbaria y Australian National Herbarium",
      publishedOn: "1920-09-09",
      accessedAt: "2026-09-05T00:00:00Z",
      assertionType: "historical_account",
    },
    {
      publicId: "source-ipni-trichocereus-macrogonus-var-pachanoi-2012",
      title: "IPNI · Trichocereus macrogonus var. pachanoi",
      citation:
        "International Plant Names Index. Trichocereus macrogonus var. pachanoi (Britton & Rose) Albesiano & R.Kiesling, Haseltonia 17:32 (2012), nomenclatural record 77125731-1. Consultado el 5 de septiembre de 2026.",
      url: "https://www.ipni.org/n/77125731-1",
      sourceType: "historical_account",
      license: "CC BY 3.0",
      attribution:
        "International Plant Names Index; Royal Botanic Gardens, Kew, Harvard University Herbaria y Australian National Herbarium",
      publishedOn: "2012-03-31",
      accessedAt: "2026-09-05T00:00:00Z",
      assertionType: "historical_account",
    },
    {
      publicId: "source-schlumpberger-renner-echinopsis-2012",
      title: "Molecular phylogenetics of Echinopsis (Cactaceae)",
      citation:
        "Schlumpberger, B. O. & Renner, S. S. (2012). Molecular phylogenetics of Echinopsis (Cactaceae): Polyphyly at all levels and convergent evolution of pollination modes and growth forms. American Journal of Botany, 99(8), 1335–1349.",
      url: "https://doi.org/10.3732/ajb.1100288",
      doi: "10.3732/ajb.1100288",
      sourceType: "scientific_publication",
      license: "publisher access; metadata and abstract cited",
      attribution:
        "Boris O. Schlumpberger; Susanne S. Renner; American Journal of Botany",
      publishedOn: "2012-08-01",
      accessedAt: "2026-09-05T00:00:00Z",
      assertionType: "academic_publication",
    },
    {
      publicId: "source-albesiano-terrazas-trichocereus-2012",
      title:
        "Cladistic Analysis of Trichocereus Based on Morphological Data and Chloroplast DNA Sequences",
      citation:
        "Albesiano, S. & Terrazas, T. (2012). Cladistic Analysis of Trichocereus (Cactaceae: Cactoideae: Trichocereeae) Based on Morphological Data and Chloroplast DNA Sequences. Haseltonia, 17, 3–23.",
      url: "https://www.cactusconservation.org/CCI/library/pdf/Albesiano_Terrazas_2012_Haseltonia_17_3-23.pdf",
      sourceType: "scientific_publication",
      license: "publisher access; article metadata and text cited",
      attribution:
        "Sofía Albesiano; Teresa Terrazas; Cactus and Succulent Society of America",
      publishedOn: "2012-01-01",
      accessedAt: "2026-09-05T00:00:00Z",
      assertionType: "academic_publication",
    },
    {
      publicId: "source-albesiano-kiesling-macrogonus-2012",
      title:
        "Identity and Neotypification of Cereus macrogonus, the Type Species of the Genus Trichocereus (Cactaceae)",
      citation:
        "Albesiano, S. & Kiesling, R. (2012). Identity and Neotypification of Cereus macrogonus, the Type Species of the Genus Trichocereus (Cactaceae). Haseltonia, 17, 24–34. https://doi.org/10.2985/1070-0048-17.1.3.",
      url: "https://cactusconservation.org/wp-content/uploads/2020/03/Albesiano_Kiesling_2012_Haseltonia_17_24-34.pdf",
      doi: "10.2985/1070-0048-17.1.3",
      sourceType: "scientific_publication",
      license: "publisher access; article metadata and text cited",
      attribution:
        "Sofía Albesiano; Roberto Kiesling; Cactus and Succulent Society of America",
      publishedOn: "2012-03-31",
      accessedAt: "2026-09-05T00:00:00Z",
      assertionType: "academic_publication",
    },
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
