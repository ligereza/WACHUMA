# `@wachuma/worker`

Ejecuta jobs idempotentes de importación, snapshots, atribuciones y
reindexado. No escribe directamente desde los importadores: coordina las
transacciones del paquete `db`.

# Worker

El worker coordina imports y snapshots; los importadores no escriben la base
directamente. Para ejecutar una sincronización GBIF explícita:

```powershell
$env:DATABASE_URL = "postgres://wachuma:wachuma-dev@localhost:5432/wachuma"
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
