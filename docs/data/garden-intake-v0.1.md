# Intake de ejemplares del jardín v0.1

El jardín tiene ahora una superficie editorial protegida en
`/admin/garden`. No es un formulario de publicación: crea un ejemplar con
visibilidad `restricted`, `sensitive` o `community-controlled` y conserva la
procedencia en `source_records` y `record_provenance`.

## Contrato operativo

La entrada requiere:

- token Bearer del API;
- `publicId` estable y entidad biológica existente;
- tipo de material, estado y visibilidad inicial no pública;
- `sourceRecordId`, fecha de recuperación, licencia, atribución y versión del
  importador;
- `sourcePublicId` existente y payload original JSON.

La clave `(data_source, sourceRecordId, retrievedAt)` hace idempotente la
repetición de una captura. Reenviar la misma entrada devuelve el registro
existente; cambiar la procedencia de un `publicId` ya ocupado produce un
conflicto, no una sobrescritura silenciosa.

## Publicación

La bandeja `/admin/review` revisa el source record por separado. Solo una
decisión aceptada con licencia, atribución y privacidad confirmadas puede
promover la proyección pública cuando la licencia sea compatible. Las
relaciones culturales tienen además su propia bandeja en `/admin/culture`,
porque la revisión comunitaria no es equivalente a una revisión de licencia.
La UI no permite enviar `public` como visibilidad inicial y no solicita
coordenadas exactas.

Este flujo permite incorporar ejemplares reales del jardín cuando exista
consentimiento de custodia, sin convertir los ejemplares demo del seed en
hechos del corpus.

## Ledger reproducible por lote

Para una colección real, el formulario individual se puede alimentar desde un
manifiesto versionado con `schemaVersion: "1.0"` en
`content/garden/ledger.example.json`. El importador vive en
`importers/garden` y el comando raíz es:

```text
pnpm import:garden:ledger -- --file ./mi-ledger.json
```

Ese modo sólo valida y resume. La aplicación requiere `--apply` y
`WACHUMA_ADMIN_TOKEN`; cada fila se envía al mismo endpoint protegido del
intake y queda pendiente. El contrato rechaza visibilidad `public`, IDs de
ejemplar repetidos y claves `(sourcePublicId, sourceRecordId, retrievedAt)`
repetidas dentro del lote. El payload original puede conservar datos exactos de
ubicación o custodia, pero no se copia a los DTOs públicos.

El archivo de ejemplo tiene cero registros deliberadamente: la herramienta
queda lista para los datos reales del jardín, pero no fabrica una colección.

## Relaciones de linaje

Las relaciones entre ejemplares o entidades usan el endpoint protegido
`POST /api/v1/admin/lineage/relationships` y el formulario
`/admin/lineage`. Acepta `parent_of`, `cutting_of`, `clone_of`, `seed_from`,
`culture_from`, `isolate_from` y `cross_of`, con el tipo explícito de cada
sujeto (`specimen` o `biological_entity`).

La relación y su `record_provenance` se crean en una transacción. Repetir el
mismo source record y los mismos sujetos devuelve la relación existente. El
árbol público sólo consulta aristas cuyo source record tiene una revisión
`accepted` con licencia, atribución y privacidad confirmadas; por eso registrar
un linaje no equivale a publicarlo.
