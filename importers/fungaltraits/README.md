# Importador FungalTraits

Este paquete implementa el contrato de ingestión para snapshots de FungalTraits
sin incluir una copia del dataset en el repositorio. Acepta la forma publicada
por el proyecto (`obj_id`, `species`, `speciesMatched`, `uuid`,
`ifungorum_number`, `trait_name`, `value`) y produce dos proyecciones:

- un `source_record` por medición, con release, DOI, cita, URL, checksum,
  licencia y atribución;
- una medición normalizada pendiente de resolver contra un taxón local y una
  definición de trait.

La identidad de cada medición incluye el número de fila del snapshot además de
`obj_id`: el release contiene identificadores de estudio repetidos y no se
deben colapsar filas distintas. Los valores vacíos se conservan como filas
pendientes con `uncertainty.valuePresence = missing`, nunca se rellenan por
inferencia.

Todas las mediciones quedan `pending`. El importador devuelve
`publicationDecision.blockers` y no considera publicable un snapshot si no se
entrega una expresión de licencia de datos soportada, una URL que sirva de
evidencia de esa licencia y la revisión marcada como `verified`. Las
expresiones permitidas son `CC0-1.0`, `CC-BY-3.0`, `CC-BY-4.0`, `CC-BY-SA-3.0`,
`CC-BY-SA-4.0` y `ODbL-1.0`.

Esto es intencional: el paquete R declara MIT para su código, pero el release
v0.0.3 en Zenodo aparece como `Other (Open)` sin una descripción adicional.
Eso no resuelve por sí solo los derechos del dataset agregado ni de sus
estudios de origen.

Uso conceptual:

```ts
const result = importFungalTraitsSnapshot({ csv, metadata });
// Persistir result.sourceRecords como pending.
// Resolver result.measurements.taxonName mediante GBIF/manual review.
// Publicar solo después de revisar licencia, taxón, trait y fuente.
```

El fixture de tests es sintético y no redistribuye filas del dataset real.
