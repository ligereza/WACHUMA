# Importador GBIF

Primer importador: taxonomía, identificadores, ocurrencias seleccionadas y
multimedia declarada por cada ocurrencia. Cada ejecución debe crear un snapshot
con licencia, atribución, URL, timestamp, payload y checksum.

`createGbifImporter` recibe un `fetch` inyectable y devuelve una proyección
taxonómica junto con `source_records` en estado `pending`. El adaptador no
descarga imágenes ni publica coordenadas: conserva el descriptor multimedia y
su licencia individual, mientras los payloads brutos quedan disponibles para
que el worker los revise y persista de forma idempotente. Una licencia de la
ocurrencia no se propaga automáticamente al archivo multimedia.

Las imágenes de GBIF deben revisarse registro por registro antes de publicarse:
el proveedor puede declarar una licencia distinta y GBIF no sustituye la
atribución del publicador. El importador conserva `identifier`, `references`,
licencia, creador, titular y el payload original; no redistribuye archivos.

Ejemplo conceptual:

```ts
const importer = createGbifImporter({ occurrenceLimit: 20 });
const snapshot = await importer.importSpecies("Echinopsis pachanoi");
```
