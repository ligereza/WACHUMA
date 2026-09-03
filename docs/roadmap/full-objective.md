# Objetivo completo de WACHUMA

Construir una plataforma abierta que funcione simultáneamente como jardín
digital, atlas biológico y base de conocimiento biocultural. Una entidad debe
poder leerse como organismo, material cultivado, ejemplar situado, parte de un
ecosistema y nodo de historias o relaciones culturales, manteniendo esas capas
separadas y conectadas por procedencia explícita.

## Resultado técnico esperado

WACHUMA debe ofrecer un monorepo mantenible con web, API y worker sobre
PostgreSQL/PostGIS. El modelo relacional debe poder exportarse después a
JSON-LD/RDF sin reconstrucción: las entidades y relaciones tienen identificadores
estables, y cada importación conserva `source`, `sourceRecordId`, `sourceUrl`,
`retrievedAt`, `license`, `attribution`, payload bruto y checksum.

El dominio cubre `Taxon`, `BiologicalEntity`, `Specimen`, `Culture`, `Location`,
`Observation`, `GrowingGuide`, `CultivationEvent`, `LineageRelationship`,
`Community`, `CulturalRelation`, `Place`, `HistoricalPeriod`, `Source`, `Media`
y `ExternalIdentifier`. La taxonomía no se duplica sin necesidad; los
proveedores externos se enlazan mediante identificadores y proyecciones
versionadas.

## Publicación responsable

Los hechos taxonómicos, observaciones contemporáneas, fuentes históricas,
evidencia arqueológica, publicaciones académicas, conocimiento comunitario e
interpretación editorial son tipos de afirmación distintos. Ninguna afirmación
cultural se publica sin fuente, perspectiva, contexto, licencia, fecha y estado
de revisión. Los registros pueden ser `public`, `restricted`, `sensitive` o
`community-controlled`; las ubicaciones exactas y los conocimientos sensibles
no se publican automáticamente.

## MVP funcional

La primera versión debe permitir:

- explorar especies y abrir fichas completas;
- consultar el jardín, ejemplares, QR, eventos y linajes;
- leer manuales de cultivo versionados, con claims y bibliografía;
- aportar relaciones culturales mediante un flujo protegido, revisable y
  retirable;
- consultar mapa, fuentes, galería y escena 3D pública;
- importar GBIF de forma reproducible, idempotente y inicialmente restringida
  hasta revisar licencias por registro y multimedia;
- mantener contratos ejecutables para iNaturalist, FungalTraits y Ethnobotany;
  Wikidata cuenta además con un staging real de claims estructurados e
  identificadores, sin importar código o datasets incompatibles.

La representación 3D usa recetas deterministas, semillas, hashes, manifiestos,
licencias y el rótulo `procedural-interpretation`. Blender/Geometry Nodes es un
adaptador externo aislado; no forma parte de las dependencias del núcleo.

Cada organismo también podrá exponerse como `MaterialFixture`: un estudio
material interactivo que conecta morfología, estado de cultivo y claims químicos
con una representación PBR/procedural. Esta capa es una traducción visual con
procedencia, no una reconstrucción científica ni una inferencia de química a
partir del brillo, color o forma.

## Criterio de término

El objetivo se considera alcanzado cuando `pnpm verify:release` pasa en un
checkout limpio con PostgreSQL/PostGIS real, el seed es idempotente, las pruebas
de integración ejercitan lectura y escritura protegida, las rutas públicas no
filtran registros privados o sensibles, los imports preservan procedencia y la
web/API/worker compilan y pasan sus pruebas. Cada fallo descubierto queda como
fixture, invariante o prueba de regresión. IA, computer vision, sensores,
Wikibase como almacenamiento primario, marketplace y publicación automática de
conocimiento sensible quedan fuera del MVP.

## Estado actual

La fundación técnica está implementada: monorepo, migraciones, API, contratos
de procedencia, capa de evidencia, derivación de materiales, traits/protocolos,
exportadores, descriptor procedural 3D, pruebas y CI. Eso demuestra que el
sistema puede sostener el modelo; no demuestra que el atlas ya esté poblado.

El primer corte público ya no depende solo de fixtures: _Echinopsis pachanoi_
tiene metadatos atribuidos de POWO/Kew y GBIF, identificadores externos y claims
que conservan la diferencia entre proveedores, más una guía RHS publicada con
sus claims horticulturales respaldados. Las proyecciones GBIF se reconcilian por
identificador externo y el taxón puede promoverse con una revisión separada y
auditable.
Siguen siendo sintéticos o restringidos los ejemplares, el linaje y la escena de
jardín. El corpus conserva una relación cultural documentada y restringida para
_Echinopsis pachanoi_ en un contexto Saraguro específico de una fuente; no se
publica automáticamente ni habla en nombre de la comunidad. El snapshot vivo de GBIF conserva ocurrencias
en staging cuando sus licencias no permiten publicación. La única ocurrencia
aceptada y publicada tras revisión explícita (`6130799370`, CC BY 4.0) y su
media asociada eran de _Opuntia ficus-indica_ y salieron con esa especie, así
que hoy no hay observaciones externas publicadas. La geometría pública es redondeada y el payload
exacto permanece en procedencia. La arquitectura de información ya se aplica a
las superficies públicas y cuenta con una bandeja web protegida para operar la
revisión editorial.

La fase activa es **MVP de contenido real v0.1**: fuentes y snapshots revisados,
proyección pública desde PostgreSQL, estados vacíos honestos, manuales
navegables por versión, búsqueda pública transversal, intake protegido del jardín
y una experiencia editorial coherente. El release gate también levanta la web contra PostgreSQL para
comprobar que la interfaz renderiza el corpus persistido y no queda congelada
en el fixture de desarrollo. El detalle requisito por requisito está en
`docs/quality/objective-audit-v0.1.md`. Blender/Geometry Nodes sigue siendo un
adaptador externo y no una dependencia del núcleo.

La integración Wikidata ya demostró el patrón de reconciliación que se usará
con otros proveedores: un taxón canónico local, identificadores externos como
entidades de primera clase, source records inmutables por recuperación y una
revisión editorial antes de cualquier promoción o publicación.
