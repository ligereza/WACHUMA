# Búsqueda pública — v0.1

La búsqueda pública es una proyección de PostgreSQL, no una copia paralela del
conocimiento. El endpoint `GET /api/v1/search?q=...&limit=...` consulta especies,
manuales publicados, relaciones culturales aceptadas, fuentes enlazadas a datos
públicos, lugares públicos y ejemplares públicos.

Cada resultado devuelve:

- `kind`, `publicId`, `title` y `summary` para la navegación;
- `path` para abrir la superficie pública correspondiente;
- `subjectPublicId` cuando el resultado pertenece a una especie o entidad;
- `sourcePublicIds` para conservar la atribución visible.

La consulta filtra en origen `visibility`, `review_status`, `sensitivity` y el
estado publicado de los manuales. Por diseño, conocer un nombre restringido no
lo vuelve encontrable: una relación cultural sensible o bajo revisión no entra
en la proyección. La API de demostración sin PostgreSQL solo conserva resultados
de los recursos demo explícitamente públicos y no serializa relaciones culturales
restringidas.

La primera implementación usa `ILIKE`. El esquema tiene 26 índices trigram
para las 37 referencias textuales que compara la consulta pública. La cobertura
se concentra en campos que crecen con el corpus: nombres taxonómicos y de
entidades, identificadores externos, claims, fuentes, guías y ejemplares.

Quedan deliberadamente sin índice trigram los valores de baja cardinalidad
(`specimens.status`, `specimens.specimen_type`,
`cultural_relations.relation_type`, `places.country_code`) y las tablas de
referencia pequeñas (`communities`, `historical_periods`). La consulta también
compara campos derivados o repetidos por sus distintas ramas —por ejemplo el
nombre científico al buscar especies, guías y ejemplares—; no son índices
adicionales ni una promesa de cobertura completa.

`pg_trgm` no sirve para patrones de menos de tres caracteres, que siguen
requiriendo un recorrido secuencial. `pnpm bench:search-indexes` ejecuta
`EXPLAIN (ANALYZE, BUFFERS)` sobre un esquema desechable y una sola condición
de una columna: mide el mecanismo del índice, no el endpoint completo
`/api/v1/search` ni un corpus real de WACHUMA.

`pnpm bench:public-search -- --rows 200000` escala temporalmente la rama de
claims con filas públicas sintéticas, ejecuta el repositorio de búsqueda y
repite la consulta SQL capturada con `EXPLAIN (ANALYZE, BUFFERS)`. La transacción
se revierte siempre; no crea especies, ejemplares, lugares ni relaciones
culturales ficticias. La prueba de integración de PostgreSQL hace la misma
medición sobre la consulta completa y el seed revisado, por lo que la cobertura
de rendimiento sigue siendo parcial: no representa todavía un corpus multirama
de producción.
