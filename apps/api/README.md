# `@wachuma/api`

API REST versionada bajo `/api/v1`. El contrato público vive en
`schemas/openapi.yaml`; el endpoint de health check es el primer corte de la
fundación técnica.

Para levantarla con PostgreSQL/PostGIS:

```powershell
$env:DATABASE_URL = "postgres://wachuma:wachuma-dev@localhost:5432/wachuma"
$env:PORT = "3001"
pnpm --filter @wachuma/api dev
```

El proceso escucha en `http://localhost:3001` y documenta el contrato en
`http://localhost:3001/docs`.

El proceso sólo usa fixtures cuando `WACHUMA_DEMO_MODE=true`. Con el modo
demo desactivado y sin PostgreSQL configurado, las lecturas públicas devuelven
colecciones vacías o `404`; nunca presentan datos de demostración como si
fueran el corpus real. Los tests unitarios que construyen la aplicación
directamente pueden activar `demoMode` para aislar el API de la base.

En las respuestas de fuentes, `sourceType` describe la categoría de la fuente
(por ejemplo `external_dataset` o `scientific_publication`). No debe
interpretarse como el tipo de afirmación: ese campo pertenece al claim y se
expone como `assertionType`.

Los snapshots externos se revisan con los endpoints protegidos
`GET /api/v1/admin/source-records` y
`POST /api/v1/admin/source-records/{sourceRecordId}/review`. Una aceptación
requiere confirmar licencia, atribución y privacidad; una licencia no
compatible mantiene restringidas las observaciones y los medios asociados.

La misma operación puede manejarse desde la bandeja local de la web en
`http://localhost:3000/admin/review`, ingresando el token configurado para el
API. La pantalla no consulta la bandeja sin token y no sustituye la revisión
por registro. Permite filtrar por `provider` o `sourceRecordId` exacto para
trabajar con snapshots grandes sin mezclar proveedores.

FungalTraits tiene una barrera adicional: sus `source_records` permanecen en
staging y una aceptación genérica responde `409 license_required` o `409
conflict` con blockers explicables hasta resolver licencia, mapeo de taxón y
definición de trait. El endpoint no permite que una casilla editorial publique
traits por accidente.

La publicación del taxón externo es una decisión adicional:
`POST /api/v1/admin/source-records/{sourceRecordId}/promote-taxon` exige
confirmar también la identidad taxonómica y solo opera sobre proyecciones GBIF
ya aceptadas.

Para incorporar un ejemplar real del jardín usa
`POST /api/v1/admin/garden/intake/specimens`. Este endpoint exige procedencia
completa, crea el ejemplar y su `source_record` en una transacción, y solo
acepta visibilidad inicial restringida. La publicación posterior se opera con
la revisión del source record; no se debe crear un ejemplar público directo
para saltar ese flujo.

Para registrar genealogía usa
`POST /api/v1/admin/lineage/relationships` o la bandeja web
`http://localhost:3000/admin/lineage`. La relación admite sujetos `specimen` o
`biological_entity`, conserva su `record_provenance` y es idempotente por
source record y arista. El árbol público sólo expone relaciones cuyo source
record fue aceptado con las confirmaciones de licencia, atribución y
privacidad.
