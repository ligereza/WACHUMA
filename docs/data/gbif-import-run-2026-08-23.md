# Ejecución GBIF · Echinopsis pachanoi · 2026-08-23

Este registro documenta una ejecución real del importador, separada del seed
editorial. Los snapshots locales se conservan bajo `.local/gbif-snapshots/` y
no se publican automáticamente.

## Comando

```powershell
$env:GBIF_IMPORT_NAME = "Echinopsis pachanoi"
$env:GBIF_OCCURRENCE_LIMIT = "2"
$env:GBIF_SNAPSHOT_PATH = ".local/gbif-snapshots/echinopsis-pachanoi-2026-08-23-live.json"
pnpm import:gbif:snapshot
```

## Resultado · Echinopsis pachanoi

- 1 registro taxonómico de GBIF Backbone.
- 2 ocurrencias externas.
- 5 registros multimedia asociados.
- estado del snapshot: `pending-license-review`.
- revisión de licencia: `incomplete`, porque el registro taxonómico no
  declara una licencia utilizable en la respuesta recibida.
- las ocurrencias mezclan `CC BY 4.0` y `CC BY-NC 4.0`; no se hereda la
  licencia de una ocurrencia a sus medios.

La respuesta viva de GBIF usa `taxonomicStatus` y `accepted`, no solamente los
campos simplificados `status` y `acceptedScientificName`. El adaptador ahora
normaliza ambas formas y conserva el payload original y su checksum; la
regresión está en `importers/gbif/test/importer.test.mjs`.

## Resultado · Opuntia ficus-indica

La misma ejecución con `GBIF_IMPORT_NAME="Opuntia ficus-indica"` produjo:

- `usageKey` `5384064`, con estado `accepted`.
- 2 ocurrencias externas y 2 registros multimedia.
- estado `pending-license-review` y revisión `incomplete` por la licencia
  faltante del registro taxonómico.

Este segundo snapshot demuestra que el adaptador no está acoplado al nombre ni
al estado taxonómico de Echinopsis; la ficha editorial correspondiente queda
anclada a sus propios source records y claims.

## Decisión editorial

El snapshot sirve como staging y evidencia de importación, pero no se convierte
en distribución pública hasta revisar por registro la licencia, la atribución,
la resolución geográfica y la relación entre el nombre solicitado y el taxón
aceptado. El seed público actual usa claims taxonómicos revisados de POWO/Kew y
conserva la diferencia taxonómica observada en GBIF como una perspectiva
separada.

La revisión administrativa se registra en `source_record_reviews` mediante:

```text
GET  /api/v1/admin/source-records?provider=gbif&status=pending
POST /api/v1/admin/source-records/{sourceRecordId}/review
POST /api/v1/admin/source-records/{sourceRecordId}/promote-taxon
```

La prueba end-to-end aceptó una ocurrencia real con licencia CC BY-NC 4.0 para
confirmar licencia, atribución y privacidad, y verificó que su observación
continuara restringida: una fuente revisada no equivale automáticamente a un
registro publicable bajo la política abierta actual.

La promoción taxonómica es una operación separada: requiere que el source
record de especie ya esté aceptado y persiste una revisión de tipo
`taxonomic_promotion` con `taxonomy_confirmed=true` antes de cambiar la entidad
biológica a visibilidad pública.

La bandeja editorial `/admin/review` expone además los objetos derivados
vinculados por procedencia: taxón, entidad biológica, observación, ejemplar o
medio. En los medios conserva URI, tipo y licencia, y permite previsualizar
imágenes cuando existe una URI pública. Así la decisión se toma sobre el
alcance real del registro importado, no sólo sobre su identificador externo.

## Prueba de publicación controlada · Opuntia · CC BY 4.0

El 23 de agosto se ejecutó además el worker con:

```powershell
$env:GBIF_IMPORT_NAME = "Opuntia ficus-indica"
$env:GBIF_OCCURRENCE_LIMIT = "3"
$env:GBIF_OCCURRENCE_LICENSE = "CC_BY_4_0"
```

El proveedor devolvió tres ocurrencias con licencia CC BY 4.0. La proyección
persistió las tres como `restricted` y devolvió `publicObservations: 0`, aun
cuando la licencia era potencialmente compatible. Después, una revisión
editorial explícita sobre una de ellas cambió su source record a `accepted` y
su observación a `public`. Esto verifica la separación entre importación,
licencia compatible y publicación.

## Prueba de multimedia con filtro explícito · Opuntia · StillImage

Para probar el camino completo de imágenes se ejecutó el worker con filtros
del proveedor:

```powershell
$env:GBIF_IMPORT_NAME = "Opuntia ficus-indica"
$env:GBIF_OCCURRENCE_LIMIT = "2"
$env:GBIF_OCCURRENCE_LICENSE = "CC_BY_4_0"
$env:GBIF_OCCURRENCE_MEDIA_TYPE = "StillImage"
```

El resultado fue:

- 2 ocurrencias externas.
- 3 registros multimedia asociados.
- 2 medios con licencia `CC BY-NC-SA 4.0`, mantenidos como `restricted`.
- 1 medio con licencia `CC BY 4.0`, aceptado mediante revisión editorial y
  visible en la ficha pública de Opuntia.

La licencia de la ocurrencia no se hereda a los medios. La consulta pública
resuelve también el recorrido `media → observation → specimen →
biological_entity`, de modo que una imagen aprobada de un ejemplar observado
puede aparecer en la galería de la especie sin perder su atribución.

## Registro canónico revisado · Opuntia · 6130799370

Además del staging descrito arriba, el seed editorial conserva una muestra
externa seleccionada para probar el recorrido completo de datos reales:

- GBIF occurrence `6130799370`, asociado a _Opuntia ficus-indica_ (`5384064`).
- fuente `source-gbif`, con URL del registro, fecha de recuperación, licencia
  y atribución a nivel de registro.
- revisión `accepted` del source record con confirmaciones de derechos,
  atribución, privacidad y taxonomía.
- observación pública `observation-gbif-6130799370` y media de la foto
  `609573877`, ambas con licencia CC BY 4.0 y atribución conservada.

La geometría exacta del proveedor queda en el payload de procedencia; la API y
el mapa sólo exponen una geometría pública redondeada. Esta observación se
presenta como registro de presencia contemporánea, no como inferencia del rango
nativo ni de abundancia. La selección no convierte las demás filas importadas
en publicables: cada ocurrencia y cada medio siguen requiriendo revisión propia.
