/**
 * Human-readable preparation for the operator's source-record decision.
 *
 * These are recommendations, not decisions.  A proposal can say that a
 * source is useful while still keeping every claim under review; the source
 * review endpoint remains the only place where a person accepts or rejects a
 * record.  The key is the provider's stable source_record_id, so repeated
 * harvests share one proposal without copying page bodies into the database.
 */

export type SourceReviewAccess =
  | "primary-publication-reviewed"
  | "landing-page-reviewed"
  | "metadata-only"
  | "access-blocked";

export type SourceReviewLicenseStatus =
  | "confirmed-on-page"
  | "declared-not-confirmed"
  | "not-stated"
  | "fair-use-only";

export type SourceReviewRecommendation = "accepted" | "rejected" | "hold";

export interface SourceReviewProposal {
  sourceRecordId: string;
  title: string;
  evidenceUrl: string;
  checkedOn: string;
  access: SourceReviewAccess;
  license: {
    declared: string;
    status: SourceReviewLicenseStatus;
    evidenceUrl?: string;
    note: string;
  };
  scope: {
    samples: string;
    region: string;
    method: string;
    date: string;
  };
  supportedStatements: string[];
  notSupported: string[];
  recommendedDecision: SourceReviewRecommendation;
  rationale: string;
  reviewerNote: string;
}

export const sourceReviewProposals: readonly SourceReviewProposal[] = [
  {
    sourceRecordId: "publication:10.1186/1746-4269-10-26",
    title:
      "Traditional medicine applied by the Saraguro yachakkuna: a preliminary approach to the use of sacred and psychoactive plant species in the southern region of Ecuador",
    evidenceUrl: "https://link.springer.com/article/10.1186/1746-4269-10-26",
    checkedOn: "2026-09-05",
    access: "primary-publication-reviewed",
    license: {
      declared: "CC BY 2.0; article data waiver CC0 unless otherwise stated",
      status: "confirmed-on-page",
      evidenceUrl:
        "https://link.springer.com/content/pdf/10.1186/1746-4269-10-26.pdf",
      note: "La licencia aparece en la primera página del PDF. Las fotografías tienen permisos y autores propios dentro del artículo.",
    },
    scope: {
      samples:
        "Diez entrevistas a yachakkuna seleccionados por el Consejo de Sanadores; muestras botánicas depositadas en herbarios.",
      region:
        "Comunidades Saraguro de la región sur de Ecuador (Loja; recolecciones en tres lugares).",
      method:
        "Entrevistas etnobotánicas, registro de usos y preparaciones, observación de prácticas; identificación de ejemplares en herbarios.",
      date: "Entrevistas realizadas entre 2010 y 2011; publicación 2014.",
    },
    supportedStatements: [
      "El estudio documenta que los yachakkuna Saraguro reportan Echinopsis pachanoi (San Pedro/aguacolla) en rituales y prácticas de sanación.",
      "El artículo describe categorías locales de enfermedad, métodos diagnósticos y usos rituales dentro de esa comunidad.",
    ],
    notSupported: [
      "No prueba eficacia clínica ni una práctica universal fuera del contexto Saraguro.",
      "No autoriza a publicar recetas, dosis, fotografías de participantes ni conocimiento cultural como instrucción general.",
    ],
    recommendedDecision: "hold",
    rationale:
      "La publicación es accesible y la licencia está confirmada, pero el contenido cultural requiere revisión comunitaria separada antes de aceptar cualquier claim público.",
    reviewerNote:
      "Revisé el PDF y confirmé alcance Saraguro, diez entrevistas (2010–2011) y CC BY 2.0. Propongo mantener este registro pendiente hasta que se documente la revisión comunitaria; no publicar recetas, imágenes ni eficacia clínica.",
  },
  {
    sourceRecordId: "scielo-pid:S0187-57792025000100601",
    title:
      "Consorcios Bacterianos con Actividad Promotora del Crecimiento Asociados a la Rizosfera de Echinopsis pachanoi",
    evidenceUrl:
      "https://www.scielo.org.mx/scielo.php?pid=S0187-57792025000100601&script=sci_arttext",
    checkedOn: "2026-09-05",
    access: "primary-publication-reviewed",
    license: {
      declared: "CC BY-NC-ND 4.0",
      status: "confirmed-on-page",
      evidenceUrl:
        "https://www.scielo.org.mx/pdf/tl/v43/2395-8030-tl-43-e1976.pdf",
      note: "El PDF identifica la licencia CC BY-NC-ND 4.0; permite atribución y distribución, pero no redistribución de derivados del artículo.",
    },
    scope: {
      samples:
        "Doce muestras de rizosfera de plantas adultas y ensayos con cepas bacterianas inoculadas en semillas de arroz.",
      region:
        "Siete áreas de la región Sierra del Ecuador (incluye Cuenca, Girón, Gualaceo, Biblián, Azogues, Otavalo y Cotacachi).",
      method:
        "Aislamiento y caracterización bacteriana; pruebas de promoción de crecimiento y tolerancia a NaCl; análisis de etileno.",
      date: "Muestreo y experimentos descritos en el artículo; publicación 2025 (e1976).",
    },
    supportedStatements: [
      "El artículo reporta consorcios bacterianos de la rizosfera de E. pachanoi y resultados de ensayos de crecimiento de arroz y estrés salino.",
      "Reporta cepas con producción de ácido indolacético y reducción de etileno bajo las condiciones experimentales descritas.",
    ],
    notSupported: [
      "No demuestra que esas bacterias sean necesarias para cultivar E. pachanoi ni que un inoculante funcione fuera del ensayo.",
      "No sustenta una composición universal del microbioma ni una recomendación horticultural.",
    ],
    recommendedDecision: "accepted",
    rationale:
      "La fuente primaria y su licencia están verificadas; puede aceptarse como referencia científica atribuida, dejando sus claims situados bajo revisión editorial.",
    reviewerNote:
      "Revisé artículo y PDF: 12 muestras, siete áreas de Sierra ecuatoriana, ensayos de arroz/NaCl y CC BY-NC-ND 4.0. Aceptar sólo como fuente; no convertir los resultados en receta ni en rasgo universal de E. pachanoi.",
  },
  {
    sourceRecordId: "unprg-handle:20.500.12893/11487",
    title:
      "Bacillus spp. y Pseudomonas spp. aisladas de la rizósfera de Echinopsis pachanoi “San Pedro hembra” en Lambayeque como potenciales promotores de crecimiento de Solanum lycopersicum L. bajo estrés hídrico",
    evidenceUrl:
      "https://repositorio.unprg.edu.pe/handle/20.500.12893/11487?show=full",
    checkedOn: "2026-09-05",
    access: "primary-publication-reviewed",
    license: {
      declared: "CC BY-SA 4.0",
      status: "confirmed-on-page",
      evidenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      note: "El registro declara Atribución-CompartirIgual 4.0 y el repositorio confirma que sus contenidos están bajo CC v4.0.",
    },
    scope: {
      samples:
        "127 cultivos puros de Bacillus spp. y 84 de Pseudomonas spp.; cuatro cultivos se probaron en tomate.",
      region:
        "Rizosfera de E. pachanoi “San Pedro hembra” en Lambayeque, Perú.",
      method:
        "Ensayos in vitro de ACC desaminasa, AIA y fosfato; diseño factorial 2 × 5 en tomate con riego cada diez días y sequía de seis días.",
      date: "Tesis de maestría publicada el 5 de junio de 2023.",
    },
    supportedStatements: [
      "La tesis reporta actividad promotora de crecimiento de ciertos aislamientos rizosféricos sobre tomate bajo las condiciones de estrés ensayadas.",
      "Reporta porcentajes y rangos de actividad sólo para los cultivos y métodos descritos en la tesis.",
    ],
    notSupported: [
      "No prueba un efecto directo de esas bacterias sobre el crecimiento de E. pachanoi.",
      "No convierte los aislamientos en biofertilizante validado ni en protocolo general.",
    ],
    recommendedDecision: "accepted",
    rationale:
      "La tesis y el resumen son accesibles y la licencia del repositorio está confirmada; aceptar el registro con obligación ShareAlike y sin publicar el PDF como parte del corpus.",
    reviewerNote:
      "Revisé el registro y resumen: aislamiento rizosférico en Lambayeque, 127/84 cultivos, cuatro tratamientos en tomate y CC BY-SA 4.0. Aceptar como fuente atribuida; mantener alcance experimental y obligación ShareAlike.",
  },
  {
    sourceRecordId: "untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
    title:
      "Caracterización genómica, proteómica y metabolómica de Hylocereus spp y Echinopsis spp (Cactaceae)",
    evidenceUrl:
      "https://repositorio.untumbes.edu.pe/items/b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
    checkedOn: "2026-09-05",
    access: "primary-publication-reviewed",
    license: {
      declared: "CC BY 4.0",
      status: "confirmed-on-page",
      evidenceUrl: "https://creativecommons.org/licenses/by/4.0/",
      note: "La página enlaza la licencia Creative Commons de Atribución 4.0; los archivos y posibles terceros deben revisarse por separado.",
    },
    scope: {
      samples:
        "Tesis comparativa de Hylocereus y Echinopsis; el resumen reporta 19 proteínas para E. pachanoi y perfiles MS/MS de mescalina en cuatro Echinopsis.",
      region:
        "Material vegetal en estado silvestre en Perú; el resumen no detalla en la ficha la procedencia de cada muestra.",
      method:
        "Código de barras ITS2, proteómica shotgun y extracción de metabolitos con TLC/MALDI TOF/TOF.",
      date: "Tesis de maestría, 2020.",
    },
    supportedStatements: [
      "La tesis describe el uso de ITS2 para identificación molecular y análisis proteómico/metabolómico comparativo en los géneros estudiados.",
      "Reporta un conteo de proteínas para las muestras etiquetadas E. pachanoi y perfiles MS/MS de mescalina en cuatro especies de Echinopsis.",
    ],
    notSupported: [
      "No permite tratar esos conteos como proteoma o composición química universal de la especie.",
      "No sustenta dosis, seguridad, potencia ni recomendación de consumo.",
    ],
    recommendedDecision: "accepted",
    rationale:
      "El registro, PDF y licencia CC BY 4.0 son accesibles; aceptar la fuente, pero exigir que cualquier claim conserve especie, muestra y método.",
    reviewerNote:
      "Revisé ficha y PDF: ITS2, shotgun proteomics y MALDI; 19 proteínas en E. pachanoi y perfiles de cuatro Echinopsis. Aceptar sólo con alcance de muestra/método; no afirmar composición universal, dosis o seguridad.",
  },
  {
    sourceRecordId: "utn-handle:123456789/7458",
    title:
      "Modelación de la distribución geográfica del hábitat del cactus Echinopsis pachanoi en el norte de los Andes ecuatorianos",
    evidenceUrl:
      "https://repositorio.utn.edu.ec/handle/123456789/7458?locale=es",
    checkedOn: "2026-09-05",
    access: "primary-publication-reviewed",
    license: {
      declared:
        "CC BY-NC-ND 4.0 (con autorización no exclusiva al repositorio)",
      status: "confirmed-on-page",
      evidenceUrl:
        "https://repositorio.utn.edu.ec/retrieve/c3fabca5-8603-4481-8d12-6ef099430c42/license.txt",
      note: "La ficha enlaza la licencia CC BY-NC-ND 4.0 y el PDF incluye una autorización no exclusiva a la universidad; no redistribuir tesis, mapas o figuras.",
    },
    scope: {
      samples:
        "63 hallazgos de presencia usados en MaxEnt; el resumen identifica dos hallazgos en condiciones naturales.",
      region:
        "Cuencas hidrográficas sobre la línea equinoccial, en el norte de los Andes ecuatorianos (Carchi e Imbabura).",
      method:
        "Modelado MaxEnt con datos de presencia y variables bioclimáticas/vegetación; análisis de distribución actual y potencial.",
      date: "Tesis de maestría, 2017.",
    },
    supportedStatements: [
      "La tesis modela una distribución potencial de 459,64 km² en su área de estudio y reporta nuevos registros en Carchi e Imbabura.",
      "La autora interpreta que la vegetación intervenida tiene alta probabilidad de presencia y plantea como posible una introducción prehispánica; esa interpretación debe citarse como tal.",
    ],
    notSupported: [
      "El mapa potencial no equivale a distribución nativa global ni a presencia confirmada en cada celda.",
      "No autoriza publicar coordenadas exactas, mapas o figuras bajo CC BY-NC-ND.",
    ],
    recommendedDecision: "accepted",
    rationale:
      "La tesis completa, el alcance espacial y la licencia están verificables; aceptar como fuente para un claim modelado y claramente regional, sin redistribuir material derivado.",
    reviewerNote:
      "Revisé tesis y licencia: 63 presencias, MaxEnt, Carchi/Imbabura, 459,64 km² y dos hallazgos naturales; CC BY-NC-ND 4.0. Aceptar fuente para distribución potencial regional, no para rango nativo global ni para publicar mapas/coordenadas.",
  },
  {
    sourceRecordId: "url:aridagriculture.org/crop/trichocereus-pachanoi",
    title: "trichocereus pachanoi",
    evidenceUrl: "https://aridagriculture.org/crop/trichocereus-pachanoi",
    checkedOn: "2026-09-05",
    access: "landing-page-reviewed",
    license: {
      declared: "Fair use; no republication beyond la excepción aplicable",
      status: "fair-use-only",
      note: "La propia página dice que el material puede estar protegido y que los usos que excedan fair use requieren permiso del titular.",
    },
    scope: {
      samples:
        "Ficha editorial; no presenta muestras, vouchers ni un método reproducible.",
      region:
        "La ficha afirma Andes a 2.000–3.000 m y enumera países, pero no aporta una fuente primaria en la entrada.",
      method:
        "Descripción editorial y enlaces externos; sin protocolo ni fecha de observación.",
      date: "Página consultada el 5 de septiembre de 2026; fecha de la ficha no establecida.",
    },
    supportedStatements: [
      "La página puede citarse como referencia editorial que usa los nombres Trichocereus pachanoi y Echinopsis pachanoi.",
    ],
    notSupported: [
      "No es evidencia primaria para rango, antigüedad de uso, plagas, cultivo o farmacología.",
      "No permite copiar texto, imágenes ni datos derivados sin permiso.",
    ],
    recommendedDecision: "hold",
    rationale:
      "La página es accesible, pero declara fair use/no republicación y no ofrece método ni autoría científica suficiente; conservar pendiente como enlace.",
    reviewerNote:
      "Revisé la ficha: presenta una descripción editorial y enlaces externos, pero su aviso de fair use exige permiso para usos más amplios. Mantener pending; no importar texto, imágenes ni cifras como claims.",
  },
  {
    sourceRecordId:
      "url:cactusysuculentas.org/cactus/echinopsis-pachanoi-historia-y-curiosidades-del-san-pedro",
    title: "Echinopsis pachanoi: historia y curiosidades del San Pedro",
    evidenceUrl:
      "https://www.cactusysuculentas.org/cactus/echinopsis-pachanoi-historia-y-curiosidades-del-san-pedro/",
    checkedOn: "2026-09-05",
    access: "landing-page-reviewed",
    license: {
      declared:
        "No se encontró licencia de reutilización del texto en la página consultada",
      status: "not-stated",
      note: "La página identifica al sitio y ofrece contenido editorial, pero no expone una licencia CC o permiso de republicación verificable.",
    },
    scope: {
      samples:
        "Artículo divulgativo; no presenta muestras, vouchers ni diseño de estudio.",
      region:
        "Describe de forma general Andes de Perú, Ecuador y Bolivia; no delimita registros ni poblaciones.",
      method:
        "Síntesis editorial de nomenclatura, historia y horticultura; no método científico declarado.",
      date: "Publicación indicada en la página: 20 de julio de 2026.",
    },
    supportedStatements: [
      "Puede servir como referencia secundaria para que el operador identifique qué nombres comunes y sinónimos circulan en divulgación.",
    ],
    notSupported: [
      "No sustituye una fuente taxonómica primaria ni prueba distribución, historia cultural o caracteres diagnósticos.",
      "No autoriza copiar el texto o sus imágenes mientras la licencia siga sin confirmar.",
    ],
    recommendedDecision: "hold",
    rationale:
      "El contenido es accesible como divulgación, pero la licencia no está declarada y sus afirmaciones no tienen método visible; dejar pending.",
    reviewerNote:
      "Revisé el artículo de historia: es divulgación secundaria, sin licencia de reutilización visible ni diseño de estudio. Mantener pending y usar sólo como enlace de contexto; no aceptar claims científicos desde esta página.",
  },
  {
    sourceRecordId: "url:herbario.istmas.edu.ec/cactaceae/cactus-san-pedro",
    title: "Cactus San Pedro",
    evidenceUrl: "https://herbario.istmas.edu.ec/cactaceae/cactus-san-pedro/",
    checkedOn: "2026-09-05",
    access: "landing-page-reviewed",
    license: {
      declared:
        "Todos los derechos reservados (pie institucional); no se identificó licencia de la ficha",
      status: "not-stated",
      note: "La página termina con copyright del Instituto Misael Acosta Solís y no muestra una licencia que permita reutilizar texto, dosis o imágenes.",
    },
    scope: {
      samples:
        "Ficha de jardín botánico; no identifica ejemplar, voucher, lote ni método analítico.",
      region:
        "Descripción general de cordillera andina y altitudes 1.000–3.000 m; sin registros georreferenciados.",
      method:
        "Ficha descriptiva; composición y posología aparecen sin referencias primarias en la página.",
      date: "Página consultada el 5 de septiembre de 2026; fecha de edición no indicada.",
    },
    supportedStatements: [
      "Puede citarse para documentar que un jardín botánico presenta una ficha bajo el nombre Cactus San Pedro.",
    ],
    notSupported: [
      "No usar sus cantidades de mescalina, usos o posología como evidencia clínica o química.",
      "No copiar la ficha ni sus imágenes sin autorización expresa.",
    ],
    recommendedDecision: "hold",
    rationale:
      "La página es accesible pero el aviso institucional no concede reutilización y la ficha contiene afirmaciones sensibles sin método; conservar pendiente.",
    reviewerNote:
      "Revisé la ficha institucional: muestra nombre, descripción y composición/posología sin referencias visibles; el pie dice copyright. Mantener pending hasta permiso y revisión científica; no publicar dosis.",
  },
  {
    sourceRecordId: "url:sanpedrosource.com/blogs/the-source-blog",
    title: "The Source Blog",
    evidenceUrl: "https://www.sanpedrosource.com/blogs/the-source-blog",
    checkedOn: "2026-09-05",
    access: "landing-page-reviewed",
    license: {
      declared:
        "No se encontró licencia de reutilización del texto en la página índice",
      status: "not-stated",
      note: "La página sólo lista artículos del blog y no muestra una licencia CC ni un permiso de republicación.",
    },
    scope: {
      samples:
        "Índice comercial/editorial; no es una publicación específica sobre un experimento.",
      region: "No delimitada en la página índice.",
      method:
        "Entradas de horticultura y comercio; el índice no declara método ni fuentes.",
      date: "Página consultada el 5 de septiembre de 2026; las entradas tienen fechas individuales.",
    },
    supportedStatements: [
      "La página prueba que existe un conjunto de entradas editoriales sobre cultivo y comercio de cactus.",
    ],
    notSupported: [
      "El índice no sostiene ningún claim específico sobre E. pachanoi, sanidad, riego o propagación.",
      "No copiar artículos, vídeos o imágenes mientras no se confirme la licencia de cada pieza.",
    ],
    recommendedDecision: "rejected",
    rationale:
      "El registro es un índice sin afirmación específica sobre pachanoi y sin licencia visible; rechazarlo como fuente de claims, conservando el enlace sólo como referencia de descubrimiento.",
    reviewerNote:
      "Revisé el índice: lista entradas de blog, pero no un artículo específico sobre E. pachanoi ni una licencia de reutilización. Rechazar como fuente de claims y no copiar contenido o medios.",
  },
  {
    sourceRecordId: "url:visionary.art/pharmakon/plants/echinopsis-pachanoi",
    title: "Echinopsis pachanoi — LILA / Pharmakon",
    evidenceUrl: "https://visionary.art/pharmakon/plants/echinopsis-pachanoi/",
    checkedOn: "2026-09-05",
    access: "landing-page-reviewed",
    license: {
      declared:
        "Licencias individuales visibles para imágenes; licencia del texto no identificada",
      status: "declared-not-confirmed",
      note: "La página acredita fotografías concretas como CC BY o CC BY-SA, pero ese crédito no licencia automáticamente el texto ni todas las imágenes.",
    },
    scope: {
      samples:
        "Monografía editorial con bibliografía; no presenta un conjunto de muestras propio ni vouchers.",
      region:
        "Síntesis sobre Andes de Ecuador, Perú y zonas introducidas; mezcla botánica, química, historia y cultura.",
      method:
        "Compilación editorial de bibliografía y créditos de imágenes; sin protocolo primario propio.",
      date: "Página consultada el 5 de septiembre de 2026; la ficha muestra referencias actualizadas hasta 2026.",
    },
    supportedStatements: [
      "Puede orientar al operador sobre términos alternativos, bibliografía y la distinción entre E. pachanoi y taxones relacionados.",
      "La página expresa explícitamente que los límites taxonómicos y los nombres hortícolas siguen siendo discutidos.",
    ],
    notSupported: [
      "No debe convertirse en fuente primaria de concentración, historia arqueológica, legalidad o uso ritual.",
      "No reutilizar su texto ni asumir que la licencia de una imagen cubre otra imagen o la monografía completa.",
    ],
    recommendedDecision: "hold",
    rationale:
      "Es una síntesis útil, pero su licencia textual y la separación de créditos de medios no están resueltas; mantener pending hasta aclarar permiso y separar claims secundarios.",
    reviewerNote:
      "Revisé la monografía LILA: es una síntesis con bibliografía y créditos individuales de imágenes, pero no licencia del texto. Mantener pending; usar sólo como pista bibliográfica, no como fuente primaria ni para copiar medios.",
  },
];

const proposalBySourceRecordId = new Map(
  sourceReviewProposals.map((proposal) => [proposal.sourceRecordId, proposal]),
);

export function getSourceReviewProposal(
  sourceRecordId: string,
): SourceReviewProposal | undefined {
  return proposalBySourceRecordId.get(sourceRecordId);
}
