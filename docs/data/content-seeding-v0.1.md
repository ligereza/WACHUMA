# WACHUMA · contrato de una base pública real v0.1

Este contrato distingue los datos de demostración del primer corpus
publicable. El objetivo no es llenar la interfaz con texto: es poder explicar
de dónde sale cada dato y por qué está visible.

## Unidad mínima publicable

Una especie o entidad biológica entra al catálogo público solo cuando tiene:

- nombre científico y rango;
- estado taxonómico y al menos un identificador externo o fuente primaria;
- fuente con URL, licencia, atribución y fecha de recuperación;
- descripción editorial separada de los hechos importados;
- distribución solo en resolución permitida por la fuente y la política de
  privacidad;
- estado de revisión explícito.

Los campos que no cumplen esta lista permanecen vacíos o en revisión. No se
fabrican descripciones ecológicas, recomendaciones de cultivo ni equivalencias
culturales para completar tarjetas.

## Fuentes iniciales por capa

| Capa                 | Fuente inicial                                         | Uso                                   | Publicación                                 |
| -------------------- | ------------------------------------------------------ | ------------------------------------- | ------------------------------------------- |
| Taxonomía            | GBIF Backbone / proveedor taxonómico revisado          | Identidad, rango, IDs y estado        | Después de validar la coincidencia          |
| Ocurrencias          | GBIF                                                   | Distribución y observaciones externas | Geometría agregada y revisión de privacidad |
| Nombres y literatura | Bibliografía identificada por editor                   | Contexto, historia y variantes        | Solo con cita y licencia verificadas        |
| Cultivo              | Publicación, manual institucional o autor identificado | Claims versionados por sección        | Claim por claim, no por documento completo  |
| Cultura              | Comunidad, archivo o fuente nominada                   | Relación contextualizada              | Revisión humana y restricciones explícitas  |
| Medios               | Registro original o proveedor con licencia individual  | Imagen, audio, modelo o enlace        | No heredar licencia entre registros         |

## Estados del pipeline

`retrieved` → `staged` → `license-review` → `editorial-review` → `published`

También existen `rejected` y `superseded`. Los payloads externos son
inmutables; una corrección crea una nueva versión o proyección y conserva la
anterior.

## Primer corpus operativo

El estado actual de este corte es parcial pero persistido: la taxonomía, los
identificadores, los claims de rango/bioma y la guía versionada de _Echinopsis
pachanoi_ ya están en PostgreSQL. La release pública deliberadamente contiene
un solo taxón para que la experiencia 3D, el cultivo, la historia, la química y
la cultura compartan un mismo eje editorial.

_Opuntia ficus-indica_ y _Pleurotus ostreatus_ salieron del repositorio. No es
una decisión de visibilidad sino de alcance: _Opuntia_ pertenece a otra
subfamilia entera y no es pariente del pachanoi, y _Pleurotus ostreatus_ es un
saprótrofo comestible que descompone madera, no un hongo que ataque al cactus ni
le cause pudrición. Conservarlos como registros restringidos mantenía vivo un
corpus que el proyecto ya no persigue. Su historia sigue en git y en los
documentos de corrida, que no se reescriben.

Las bases heredadas se limpian con la migración
`0024_remove_out_of_scope_taxa.sql`. Antes de aplicarla se debe conservar un
backup o export de `source_records`: la operación es transaccional, elimina
las dependencias de esos dos taxones en el orden de claves foráneas, conserva
fuentes bibliográficas compartidas y elimina un `source_record` sólo cuando ya
no tiene provenance, claims, revisiones ni referencias de escenas. El seed no
recrea esos registros. `pnpm quality:retired-scope` prueba el caso heredado en
una transacción aislada y hace rollback al terminar.

Lo que sí entra alrededor del eje son las cactáceas emparentadas —_Echinopsis
peruviana_, _Echinopsis lageniformis_ / _Trichocereus bridgesii_ y los taxones
con teorías que preceden o proceden al pachanoi— y los hongos que comúnmente lo
atacan o lo pudren. Ninguno de esos registros se inventa: entra con fuente,
alcance y revisión como cualquier otra afirmación.

La primera release monográfica comienza con _Echinopsis pachanoi_, cuyo nombre
GBIF puede aparecer como sinónimo frente a una aceptación taxonómica distinta.
Las variantes cercanas y los nombres que suelen confundirse con ella se
modelarán después como relaciones taxonómicas o culturales contextualizadas,
no como especies equivalentes por defecto.

El corpus también conserva una relación cultural real pero no publicable por
defecto: el artículo de Armijos, Cota y González (2014) registra el nombre
“San Pedro” para _Echinopsis pachanoi_ en el contexto de entrevistas con
yachakkuna Saraguro. WACHUMA la guarda como `under-review`, `restricted` y
`sensitive`, con comunidad y lugar acotados a la fuente, sin coordenadas y sin
presentarla como equivalencia taxonómica universal. La fuente es CC BY 2.0 y
su relación tiene `record_provenance` propio.

Los casos comparten:

- una coincidencia taxonómica documentada;
- identificadores externos persistidos;
- claims de distribución/ecología con fuente visible;
- ocurrencias agregadas con atribución y geometría pública protegida cuando la
  revisión de licencia lo permite;
- una ficha que distingue `Trichocereus pachanoi` como nombre histórico o
  combinación documentada cuando una fuente lo sostenga;
- un manual versionado que declare las 15 secciones de cultivo, incluyendo
  estados `not_documented`, `in_review` o `not_applicable` cuando no haya una
  fuente suficiente;
- nombres culturales separados de taxonomía y sin publicación automática de
  afirmaciones no revisadas;
- ejemplares privados ficticios claramente marcados como datos de jardín demo.

El dataset de FungalTraits no se importa en este corte: el repositorio publica
su código bajo MIT, pero sus datos agregados y estudios fuente requieren una
revisión de derechos y atribución por versión antes de proyectar traits como
claims públicos.

Los registros GBIF incompatibles con la política pública —por ejemplo, CC
BY-NC o licencias desconocidas— pueden conservarse para trazabilidad, pero sus
observaciones y medios permanecen restringidos. La revisión registra quién
decidió, qué confirmó y cuándo, en `source_record_reviews`.

Luego se incorporan más taxones mediante el mismo contrato, no copiando los
fixtures de las primeras especies.

La ficha DB proyecta como capas separadas los claims ecológicos aceptados, el
historial taxonómico editorial y los resúmenes de guías publicadas. La
aparición de una guía no convierte sus recomendaciones en hechos taxonómicos:
el detalle conserva los claims de cultivo con sus fuentes y versión.

## Incorporación de ejemplares reales del jardín

Los ejemplares del jardín tienen un camino separado del seed demo:
`POST /api/v1/admin/garden/intake/specimens`. La entrada exige una fuente de
registro, `sourceRecordId`, fecha de recuperación, licencia, atribución, versión
del importador y payload original. La API la crea inicialmente como
`restricted`, `sensitive` o `community-controlled`; nunca acepta `public` en
este paso.

La operación escribe en una única transacción:

1. `source_records` con proveedor `wachuma-garden`;
2. `specimens` enlazado a la entidad biológica;
3. `record_provenance` enlazando el source record, la fuente bibliográfica y el
   ejemplar.

El registro se puede repetir de forma idempotente usando el mismo
`sourceRecordId` y `retrievedAt`. La revisión protegida de source records es la
única que puede cambiar la proyección del ejemplar a pública cuando la licencia
es compatible y se confirman atribución y privacidad. Los ejemplares
introducidos por los tests son fixtures identificados como tales y no cuentan
como corpus real.

## Criterio de datos reales

El corpus deja de ser una demo cuando una ejecución limpia puede reconstruirlo
desde migraciones, snapshots y seed editorial; la interfaz consulta esas filas
persistidas; las fuentes y licencias son visibles; y eliminar la API o el seed
de fallback produce estados vacíos honestos en lugar de contenido ficticio.
La auditoría `quality:content-db` es deliberadamente direccional: garantiza que
cada manifiesto editorial versionado esté persistido, mientras que las
proyecciones externas adicionales pueden conservarse en PostgreSQL sin tener
que duplicarse en los JSON editoriales.

El catálogo de archivos se descubre desde `content/species/`,
`content/cultivation-guides/` y `content/cultures/` mediante
`pnpm content:manifest`. Los manuales versionados alimentan directamente el
seed en sus metadatos, cobertura de 15 secciones y claims. Los UUID locales
siguen siendo explícitos para mantener fixtures idempotentes; un manual nuevo
debe recibir una decisión de persistencia antes de poder entrar al seed.

## Proyección editorial reproducible

El loader de `packages/db/src/editorial-content.ts` descubre todos los JSON sin
listas codificadas a mano y construye un catálogo único de fuentes a partir de
las especies. Cada fuente exige `publicId`, título, cita, `sourceType`, licencia,
atribución, `accessedAt` y una clasificación de la afirmación. DOI y fechas de
publicación son opcionales, pero se conservan cuando existen. Los hechos
taxonómicos/ecológicos publicables también viven en `claims` dentro de cada
documento de especie: cada claim exige `sourcePublicId`, el identificador del
registro del proveedor (`sourceRecordId`), perspectiva, fecha, visibilidad y
estado de revisión. El seed conserva un registro de IDs deterministas para no
romper referencias históricas, pero proyecta el valor editorial desde esos
documentos.

Durante `pnpm db:seed`, ese catálogo proyecta de forma idempotente las fuentes,
los campos editoriales del taxón monográfico, sus identificadores externos y las
relaciones culturales. Los registros de procedencia y ocurrencia importados
siguen siendo snapshots con revisión separada. `pnpm quality:content-db`
compara los valores declarativos contra PostgreSQL, incluyendo sensibilidad,
acceso, estado de revisión, agentes, comunidad, lugar, periodo y fuente de
cada relación cultural.

El orden reproducible es:

1. `pnpm quality:content`
2. `pnpm content:manifest`
3. `pnpm db:migrate`
4. `pnpm db:seed`
5. `pnpm quality:content-db`

No se debe ejecutar el seed y la auditoría en paralelo: la auditoría debe leer
la transacción de seed ya confirmada.
