# Contenido versionado

Los fixtures y textos editoriales se organizan en `species/`,
`cultivation-guides/`, `cultures/` y `scenes/`. Las escenas 3D conservan receta,
semilla, versión del algoritmo, hash del asset, licencia y atribución. El
contenido comunitario debe conservar revisión, sensibilidad, licencia y
procedencia en sus registros estructurados.

El manifiesto editorial se descubre automáticamente desde estas carpetas con
`pnpm content:manifest`; no hay que mantener una lista paralela en cada
validador. `quality:content` comprueba la forma de todos los archivos y
`quality:content-db` comprueba la paridad desde el contenido versionado hacia
PostgreSQL. Las fuentes se agregan por `publicId` en todo el corpus: una
definición conflictiva falla el loader antes de tocar la base. La proyección de
especies, fuentes, identificadores externos y relaciones culturales es
idempotente; sus campos editoriales no se mantienen en un segundo bloque SQL.
Las importaciones externas adicionales pueden vivir en la base como
proyecciones revisadas sin duplicarse en estos archivos.

El seed usa los documentos de manuales como autoridad para cobertura y claims,
y el catálogo de fuentes como autoridad para título, cita, licencia,
atribución, DOI y fechas de publicación/consulta.
Los UUID deterministas siguen en el seed porque son una decisión de fixture
local; si un manual nuevo no tiene ese mapeo explícito, el seed falla antes de
escribir datos.
