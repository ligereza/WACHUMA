# Evidencia de CI — 2026-08-23

Esta nota registra la corrida remota observada antes de añadir los gates de
SBOM y preparación de release de contenido.

| Campo    | Valor                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- |
| Workflow | `WACHUMA verification`                                                                         |
| Commit   | `903ed48a0581468fb2729c1c9dcb733fb49c9ff7`                                                     |
| Estado   | `completed / success`                                                                          |
| Servicio | `postgis/postgis:16-3.4`                                                                       |
| Job      | `release-gate`                                                                                 |
| Duración | 2m 11s                                                                                         |
| Registro | [GitHub Actions run 32647456773](https://github.com/ligereza/WACHUMA/actions/runs/32647456773) |

La corrida ejecutó el gate reproducible que estaba versionado en ese commit.
Los cambios posteriores requieren una nueva corrida después de commit y push;
esta evidencia no se presenta como validación remota de cambios locales no
publicados.

## Validación local posterior

La revisión local posterior ejecutó `pnpm verify:release` con PostgreSQL/PostGIS
real y terminó en `all automated gates passed`. Incluyó 32 tareas de typecheck,
36 tareas de test, build de los 18 workspaces, validación de contenido,
licencias, 19 SBOM CycloneDX, política de release, 20 migraciones,
adaptador procedural, GLB, formato, seed idempotente, integración DB,
auditoría de corpus y smoke web. Esta evidencia
confirma el checkout local; no sustituye el CI remoto que debe ejecutarse tras
publicar los cambios.

## Validación local final de la ficha de especie

La última corrida volvió a pasar todos los gates después de conectar la ficha
DB a claims ecológicos e históricos públicos aceptados y a resúmenes de guías
publicadas. El smoke web verificó las tres especies del corpus inicial y la
variante histórica `Trichocereus pachanoi`; la prueba de integración conserva
la separación entre esa interpretación taxonómica editorial y las relaciones
culturales restringidas.

## Cierre local de la superficie editorial

La corrida final también verificó la ficha navegable de manuales por versión,
sus claims y enlaces de fuente, junto con el formulario protegido de intake en
`/admin/garden`. El intake rechaza `public` como visibilidad inicial y exige
procedencia para que un ejemplar del jardín pueda entrar al circuito de revisión
sin aparecer automáticamente en el atlas público. El estado sigue siendo local:
el CI remoto y la incorporación de ejemplares reales con consentimiento
requieren commit/push y coordinación humana posterior.

## Búsqueda pública transversal

La misma verificación local comprobó `GET /api/v1/search` y la ruta web
`/search?q=pachanoi` contra PostgreSQL real. El resultado incluye la especie y
su manual versionado con sus fuentes; una consulta por `wachuma` no serializa
las relaciones culturales restringidas. La migración `0016` añade índices
trigram para que la proyección pueda crecer sin duplicar el modelo canónico.

La bandeja editorial quedó verificada contra PostgreSQL: cada
`AdminSourceRecord` incluye los objetos derivados vinculados por procedencia y
el registro GBIF de prueba expone su destino taxonómico antes de una nueva
decisión editorial. La respuesta administrativa y la interfaz también exponen
el `rawPayload` estructurado del origen para que la decisión sea auditable. La
misma bandeja ya puede mostrar identificadores externos como targets revisables,
incluyendo los cinco enlaces derivados de Wikidata.

La publicación taxonómica ya no incluye identificadores externos sólo porque
estén asociados a una especie: el enlace debe tener `record_provenance`, un
source record aceptado y una revisión aceptada con licencia, atribución y
privacidad confirmadas. La regresión Wikidata comprueba que un identificador
pendiente no aparece en la ficha ni en la búsqueda pública.

El importador iNaturalist quedó incluido en el workspace, SBOM y gate de
release. Una corrida real local persistió 22 `source_records`, 6 observaciones y
10 medios, todos `pending`/`restricted`; las licencias de observación y media
se conservaron por separado, y la proyección no expone coordenadas con
geoprivacidad `obscured` o `private`.

El importador Wikidata quedó incluido en el workspace, SBOM y gate de release.
Una corrida real local persistió `item:Q133426`, enlazó el taxón editorial de
_Echinopsis pachanoi_ sin duplicarlo y registró cinco identificadores externos
con `record_provenance`. Claims textuales, nombres vernáculos y multimedia no
se importaron; el source record permanece `pending`.

El importador FungalTraits también se probó con el release real `v0.0.3` sin
copiar el snapshot al repositorio: 51.555 filas se persistieron como
`source_records` pendientes, con DOI, checksum y payload por fila. La decisión
de publicación ahora conserva blockers explícitos: la licencia MIT del paquete
R no se hereda al CSV agregado y `Other (Open)` sin expresión de datos
soportada no habilita traits públicos. `quality:corpus` verifica que esos
registros continúen pendientes y con checksum.

Los dos primeros CI remotos posteriores a ese cambio revelaron el mismo patrón
durante `db:verify`: el seed insertaba dos veces cada relación cultural, una vez
desde `content/cultures` y otra desde fixtures SQL hardcodeados. Se eliminaron
ambas inserciones duplicadas. El tercer CI mostró una consecuencia distinta:
la relación Saraguro debía conservar el UUID editorial histórico usado por la
regresión de procedencia. El único seed editorial conserva ahora los UUID
estables de las dos relaciones y la procedencia sigue resolviendo por
`publicId`. La corrida local posterior reproduce seed, 37 tests de API con
PostgreSQL y el seed de restauración sin violar
`cultural_relations_public_id_idx`. El CI remoto `32681626456`, sobre el
commit `ad5e55d`, confirmó la corrección completa en Ubuntu/PostGIS; la única
anotación fue la advertencia de deprecación de Node 20 en las actions de
GitHub, sin impacto en el gate.

El commit `d829098` añadió el ledger protegido del jardín. La corrida remota
`32682656294` volvió a pasar en Ubuntu/PostGIS: 19 workspaces, 33 typechecks,
38 tareas de tests, 19 builds, 20 artefactos SBOM y la compuerta DB-backed
completa. El importador `@wachuma/importer-garden` aportó seis pruebas, y el
manifiesto de ejemplo se mantuvo vacío. La única anotación siguió siendo la
deprecación de Node 20 en las actions de GitHub.

## Verificación remota más reciente

| Campo    | Valor                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- |
| Workflow | `WACHUMA verification`                                                                         |
| Commit   | `5a03d4f818085404ba959b7883dad60690a33fd5`                                                     |
| Estado   | `completed / success`                                                                          |
| Servicio | `postgis/postgis:16-3.4`                                                                       |
| Job      | `release-gate`                                                                                 |
| Duración | 2m 57s                                                                                         |
| Registro | [GitHub Actions run 32724376393](https://github.com/ligereza/WACHUMA/actions/runs/32724376393) |

Esta corrida verificó los claims de especie declarados en contenido, su
proyección con source records y la paridad contenido-PostgreSQL junto con los
gates completos del repositorio: 33 typechecks, 38 tareas de tests, 19 builds,
20 SBOM, 20 migraciones, auditoría de corpus y smoke web DB-backed. La única
anotación fue la deprecación de Node 20 en las actions de GitHub; no cambió el
resultado del gate.

El nuevo `quality:corpus` consulta la base persistida después del seed y
verifica 22 invariantes de salud, incluida una decisión de revisión aceptada
con confirmaciones de derechos para cada proyección externa pública: la corrida local reportó cero violaciones y
dejó conteos reproducibles de taxones, entidades, ejemplares, observaciones,
medios, fuentes pendientes/aceptadas y relaciones culturales en revisión.

La cobertura de procedencia incluye también aristas de linaje: una relación
cuyos sujetos sean públicos debe tener un `record_provenance` y un source
record aceptado con licencia, atribución y privacidad confirmadas.

También comprueba que cualquier relación cultural pública aceptada conserve
quién la revisó y cuándo; la migración `0018` persiste esos metadatos sin
confundirlos con la persona o comunidad que documentó la relación.

`quality:content-db` compara además los documentos versionados de especies,
manuales y cultura con sus filas de PostgreSQL. La última ejecución reportó
3 especies, 4 manuales, 20 claims y 2 relaciones culturales con cero
divergencias.

El catálogo editorial ahora se descubre automáticamente desde las carpetas de
contenido. `quality:content-manifest` prueba la incorporación de un documento
nuevo en un corpus temporal y rechaza identificadores duplicados; el seed usa
los documentos de manuales para metadatos, cobertura y claims. La compuerta
completa volvió a pasar después de este cambio.

La ejecución web también verifica el límite entre datos y demo: con
`WACHUMA_API_URL` ausente y `WACHUMA_DEMO_MODE=false`, el explorador no muestra
la especie sintética y la ficha demo responde `404`; el corpus de demostración
sólo se habilita de forma explícita.
