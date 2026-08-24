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

Todas las mediciones quedan `pending`. El importador no considera publicable un
snapshot si no se entrega una licencia del release exacto, una URL que sirva de
evidencia de esa licencia y la revisión marcada como `verified`. Esto es
intencional: el paquete R declara MIT para su código, pero el archivo `LICENSE`
del repositorio no basta por sí solo para resolver los derechos del dataset
agregado y de sus estudios de origen.

Uso conceptual:

```ts
const result = importFungalTraitsSnapshot({ csv, metadata });
// Persistir result.sourceRecords como pending.
// Resolver result.measurements.taxonName mediante GBIF/manual review.
// Publicar solo después de revisar licencia, taxón, trait y fuente.
```

El fixture de tests es sintético y no redistribuye filas del dataset real.
