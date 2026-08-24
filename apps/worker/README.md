# `@wachuma/worker`

Ejecuta jobs idempotentes de importación, snapshots, atribuciones y
reindexado. No escribe directamente desde los importadores: coordina las
transacciones del paquete `db`.

# Worker

El worker coordina imports y snapshots; los importadores no escriben la base
directamente. Para ejecutar una sincronización GBIF explícita:

```powershell
$env:DATABASE_URL = "postgres://wachuma:wachuma-dev@localhost:55432/wachuma"
$env:GBIF_IMPORT_NAME = "Echinopsis pachanoi"
pnpm --filter @wachuma/worker dev
```

El resultado queda en `source_records` como `pending` y el proyector crea
registros normalizados con procedencia; los registros sin licencia compatible
permanecen restringidos. La promoción a datos publicables requiere una revisión
posterior de licencia, atribución y normalización taxonómica. Para generar un
snapshot reproducible local sin
incorporarlo automáticamente al repositorio:

```powershell
$env:GBIF_IMPORT_NAME = "Echinopsis pachanoi"
$env:GBIF_OCCURRENCE_LIMIT = "20"
pnpm import:gbif:snapshot
```

El archivo se guarda bajo `.local/gbif-snapshots/`, se marca
`pending-license-review` y conserva cada payload y checksum. Las multimedia
mantienen una auditoría de licencia separada de la licencia de la ocurrencia.

Para importar una página de observaciones de iNaturalist:

```powershell
$env:INATURALIST_IMPORT_NAME = "Echinopsis pachanoi"
$env:INATURALIST_QUALITY_GRADE = "research"
$env:INATURALIST_OPEN_GEO_ONLY = "true"
$env:INATURALIST_PHOTO_LICENSE = "cc0,cc-by"
pnpm --filter @wachuma/worker dev
```

Se puede limitar el tamaño con `INATURALIST_PER_PAGE` y filtrar la licencia de
la observación con `INATURALIST_OBSERVATION_LICENSE`. El adaptador conserva la
licencia individual de cada foto/sonido, no descarga archivos y mantiene todo
el resultado como `pending` hasta revisión editorial.

Para importar un ítem Wikidata por QID o por nombre científico:

```powershell
$env:WIKIDATA_QID = "Q133426"
# Alternativa: $env:WIKIDATA_IMPORT_NAME = "Echinopsis pachanoi"
pnpm --filter @wachuma/worker dev
```

El adaptador persiste únicamente claims estructurados seleccionados e
identificadores externos (Wikidata, GBIF, iNaturalist, IPNI y NCBI cuando
existen). No copia texto descriptivo, nombres vernáculos ni multimedia; el
ítem, sus identificadores y el taxón proyectado quedan `pending` hasta revisión
editorial.

Para dejar un snapshot FungalTraits en staging, apunta
`FUNGALTRAITS_SNAPSHOT_PATH` a un archivo obtenido por fuera del repositorio y
define también `FUNGALTRAITS_RELEASE_VERSION`, `FUNGALTRAITS_SNAPSHOT_URL`,
`FUNGALTRAITS_DOI`, `FUNGALTRAITS_CITATION`, `FUNGALTRAITS_LICENSE`,
`FUNGALTRAITS_ATTRIBUTION` y `FUNGALTRAITS_LICENSE_REVIEW` (`unresolved` o
`verified`). `FUNGALTRAITS_LICENSE_EVIDENCE_URL` solo se acepta como evidencia
adicional. Para una revisión `verified` se debe definir también
`FUNGALTRAITS_LICENSE_EXPRESSION` con una expresión de licencia de datos
soportada; `Other (Open)` no es suficiente. Una revisión `unresolved`, una
expresión ausente/no soportada o una evidencia inválida siempre dejan los
registros pendientes.
El worker persiste un `source_record` por medición y no crea claims o traits
públicos automáticamente.
