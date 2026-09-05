# Capacidades

Qué sabe hacer WACHUMA. Se lee junto a [`NOMENCLATURA.md`](NOMENCLATURA.md),
que define las palabras que aquí se usan sin explicar.

**Aquí no van conteos.** Cuántas especies, fuentes o claims hay se pregunta a la
máquina: `pnpm content:manifest` para el corpus editorial, `pnpm quality:corpus`
para lo persistido. Lo que sigue describe el aparato, no su inventario.

## Qué clase de repositorio es

Un repositorio de producto se organiza alrededor de lo que el usuario puede
hacer: el código es el producto y los datos son combustible. Aquí está
invertido. **Los datos son el producto y el código es la cadena de custodia.**

Se nota en el modelo: buena parte de las tablas no habla del cactus, habla de
quién lo dijo, de dónde salió, bajo qué licencia, quién lo revisó y hasta dónde
puede verse — `source_records`, `source_record_reviews`, `record_provenance`,
`claim_sources`, `scene_asset_provenance`. Y la superficie `/admin` no es un
gestor de contenidos: es un escritorio de revisión, y sus verbos son revisar,
promover, retirar e ingresar.

La pregunta que este repositorio optimiza no es "¿podemos publicar esto?" sino
**"¿podemos defenderlo?"**. Por eso su comportamiento más característico es
negarse, y eso no es un defecto: es la función.

## Lo que sabe hacer

**Sostener una afirmación con su procedencia.** Cada claim arrastra fuente,
source record, perspectiva del autor, nivel de evidencia, fecha y estado de
revisión. `sourceType` y `assertionType` se declaran por separado.

**Negarse a publicar, registro por registro.** La revisión confirma licencia,
atribución, privacidad y taxonomía de forma independiente; la visibilidad tiene
cuatro grados y no se hereda del dataset. Un proveedor cuya expresión de
licencia no está soportada queda bloqueado con sus impedimentos explícitos, por
muchas filas que traiga.

**Reconciliar proveedores externos sin fundirlos.** Los identificadores externos
son entidades de primera clase; cada proveedor conserva su identidad y su
recuperación cruda. Promover una proyección al catálogo público es un acto
separado y auditable.

**Separar el nombre cultural de la taxonomía.** Una relación cultural exige
comunidad o perspectiva documentada, territorio, fecha, fuente, licencia y
revisión. Ninguna se publica por parecerse a un sinónimo.

**Llevar el jardín físico.** Ejemplares con código público y QR, geometría
pública redondeada separada de la exacta, linajes de esqueje, clon, semilla y
cruza, y eventos de cultivo.

**Versionar el cultivo diciendo lo que falta.** Las guías declaran cobertura
sección por sección y marcan lo no documentado en vez de dejar un hueco
silencioso.

**Representar el organismo en 3D como interpretación.** Escenas versionadas con
hash y manifiesto, recetas deterministas con semilla, y el rótulo
`procedural-interpretation` que impide leer un render como evidencia.

El GLB exportado no conserva identidad de vértice (`rib_id`, `areole_id`, `u`,
`local_s`, `birth_frame`); esa correspondencia requeriría un sidecar versionado
y una prueba contra el GLB.

**Buscar con cobertura declarada.** La búsqueda textual es parcial: se limita a
los campos comparados por sus índices y los patrones de menos de tres caracteres
quedan fuera de la cobertura de `pg_trgm`.

**Exportarse sin perder identidad**, a Darwin Core, JSON-LD/PROV-O y RO-Crate.
`pnpm export:public` produce el archivo Darwin Core, el grafo RO-Crate y un
manifiesto SHA-256 desde las proyecciones públicas; `pnpm quality:public-export`
comprueba la reconstrucción, la atribución y que no se filtren registros
restringidos.

**Revisar fuentes sin perder alcance.** `/admin/review` muestra para cada
`source_record_id` pendiente una propuesta editorial con evidencia, licencia,
muestras, región, método, qué sostiene y qué no sostiene, además del diff con
la proyección pública. `pnpm quality:source-review` comprueba que las 14 filas
web actuales (10 IDs estables por cosechas repetidas) tengan cobertura. La
propuesta no cambia estados ni publica automáticamente.

**Medirse solo.** `pnpm verify:release` corre la batería completa —tipos, lint,
pruebas, build, contenido, licencias, SBOM, migraciones, formato, siembra
idempotente, integración contra PostgreSQL, auditoría del corpus, paridad entre
contenido y base, y humo de la web— y se detiene en la primera puerta que falla.
Un verde después de arreglar algo puede esconder la siguiente rotura: se vuelve
a correr entera.

## Lo que deliberadamente no hace

Sin cuentas de usuario, sin pagos, sin publicación automática, sin visión por
computador, sin sensores, y sin conocimiento cultural sensible publicado por
defecto. La bandeja de administración no sirve para editar contenido, sino para
decidir sobre él.

## Dónde está el límite hoy

El aparato está construido; el corpus no está poblado. Que el sistema pueda
sostener el modelo no demuestra que el atlas exista. Lo que falta para poblarlo
—revisar cada fuente contra su publicación original, resolver licencias,
registrar decisiones comunitarias, incorporar custodia real de ejemplares— es
trabajo humano, y ninguna puerta automática lo va a firmar.

`docs/quality/objective-audit-v0.1.md` lleva ese estado requisito por requisito.
