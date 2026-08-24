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

La primera implementación usa `ILIKE` con índices trigram sobre las columnas
textuales principales. Si el corpus crece hasta requerir ranking lingüístico,
se puede añadir una proyección de búsqueda o `tsvector` sin cambiar los
identificadores ni la procedencia del modelo canónico.
