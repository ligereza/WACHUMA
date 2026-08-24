# Importador de ledger del jardín

Este paquete convierte un manifiesto JSON de custodia en entradas compatibles
con `POST /api/v1/admin/garden/intake/specimens`.

El manifiesto es deliberadamente conservador:

- exige `schemaVersion: "1.0"` y un `sourcePublicId` existente;
- cada ejemplar necesita `sourceRecordId`, payload original y atribución;
- sólo acepta visibilidad inicial `restricted`, `sensitive` o
  `community-controlled`;
- conserva coordenadas exactas, custodios y notas privadas únicamente dentro
  de `provenance.rawPayload`;
- rechaza IDs de ejemplar y claves de procedencia duplicadas dentro del lote;
- no publica, promueve ni modifica PostgreSQL por sí mismo.

El comando raíz `pnpm import:garden:ledger -- --file <manifiesto>` valida el
archivo y muestra un resumen. Para aplicar el lote al API protegido se debe
indicar explícitamente `--apply` y `WACHUMA_ADMIN_TOKEN`:

```text
pnpm import:garden:ledger -- --file content/garden/ledger.example.json
WACHUMA_API_URL=http://localhost:3001 WACHUMA_ADMIN_TOKEN=… \
  pnpm import:garden:ledger -- --file ./mi-ledger.json --apply
```

La aplicación es idempotente por el contrato del endpoint y deja todos los
registros pendientes de revisión. El archivo de ejemplo está vacío a
propósito: no representa ejemplares reales.
