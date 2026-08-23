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
- mantener contratos ejecutables para iNaturalist, Wikidata, FungalTraits y
  Ethnobotany sin importar código o datasets incompatibles.

La representación 3D usa recetas deterministas, semillas, hashes, manifiestos,
licencias y el rótulo `procedural-interpretation`. Blender/Geometry Nodes es un
adaptador externo aislado; no forma parte de las dependencias del núcleo.

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

La vertical de aplicación, la capa de evidencia, el grafo de derivación de
materiales, traits/protocolos, exportadores Darwin Core/JSON-LD/RO-Crate y el
descriptor procedural 3D están implementados en el repositorio. En este
entorno ya pasan typecheck, tests, build, formato y validadores de contenido,
licencias, migraciones, procedural y GLB.

El gate completo todavía requiere ejecutar `pnpm verify:release` con
PostgreSQL/PostGIS real. La prueba de integración se mantiene omitida cuando
no existe `DATABASE_URL`; por eso no se declara cierre de release hasta correr
ese gate en un entorno con la base disponible. Blender/Geometry Nodes sigue
siendo un adaptador externo y no una dependencia del núcleo.
