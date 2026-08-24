# WACHUMA · arquitectura de información y contrato editorial v0.1

Este documento fija el primer corte de experiencia para que la interfaz no se
construya a partir de rutas aisladas. Es una propuesta operativa del MVP y
debe evolucionar con contenido real; no presupone que la navegación final tenga
pestañas. El contrato visual complementario está en
`docs/product/visual-language-v0.1.md`: allí quedan fijados los tokens,
componentes, estados de evidencia y criterios de accesibilidad que acompañan
esta arquitectura.

## Problema que resuelve

La versión actual tiene una vertical técnica demostrable, pero no permite que
una persona entienda qué información es pública, qué es una observación del
jardín, qué es una fuente externa y qué es una interpretación editorial. La
primera versión real debe convertir esas capas en una lectura continua y
verificable.

## Personas y tareas principales

### Visitante del atlas

Quiere encontrar un organismo, entender su identidad taxonómica, ver su
distribución pública y seguir las fuentes sin confundir un nombre cultural con
un sinónimo científico.

### Cultivador o cuidador

Quiere consultar manuales versionados, registrar ejemplares y eventos, y
seguir material biológico mediante un identificador público sin exponer datos
privados.

### Investigador o editor

Quiere revisar afirmaciones, comparar fuentes, conservar snapshots externos y
publicar únicamente registros con procedencia y licencia suficientes.

### Comunidad relacionada

Quiere aportar o revisar conocimiento cultural con nombre, perspectiva,
territorio, fecha, licencia y control sobre sensibilidad y publicación.

## Arquitectura de información

La navegación se organiza por tareas, no por el esquema interno de la base:

1. **Explorar**: buscador y catálogo de taxones o entidades biológicas.
2. **Ficha**: lectura integrada de una entidad, con capas claramente
   rotuladas: organismo, cultivo, ejemplar, linaje, cultura y fuentes.
3. **Jardín**: colección viva, ejemplares, eventos, ubicaciones públicas y
   estudio espacial 3D.
4. **Conocimiento**: manuales de cultivo, relaciones culturales, historia y
   biblioteca de fuentes.
5. **Mapa**: distribución y lugares publicables, con privacidad aplicada.

La portada debe explicar el proyecto y conducir a una tarea. No debe funcionar
como un índice de todas las tablas ni obligar a leer una metáfora antes de
encontrar datos.

## Composición de una ficha

El orden editorial propuesto para una ficha es:

1. Identidad: nombre aceptado, rango, autoridad/proveedor y estado de revisión.
2. Resumen: descripción breve y advertencias de alcance.
3. Taxonomía: identificadores, combinaciones históricas y sinónimos con fuente.
4. Distribución y ecología: regiones o geometrías públicas, nunca coordenadas
   exactas sensibles.
5. Cultivo: guías publicadas, contexto regional/técnico y fecha de versión.
6. Jardín: ejemplares, observaciones y eventos visibles.
7. Linaje: procedencia y relaciones de material biológico.
8. Cultura e historia: relaciones de primera clase, contexto y nivel de
   evidencia.
9. Medios: imagen, modelo o recurso con licencia y atribución individual.
10. Fuentes: bibliografía y registros recuperados que sostienen cada capa.

Cada bloque debe poder mostrar un estado explícito: `publicado`, `en
revisión`, `sin datos` o `restringido`. Nunca se debe completar un vacío con
texto que parezca un hecho.

## Regla de evidencia visible

Los hechos taxonómicos, observaciones contemporáneas, fuentes históricas,
evidencia arqueológica, publicaciones académicas, conocimiento comunitario e
interpretaciones editoriales se muestran con etiquetas distintas. Una relación
cultural pública requiere, como mínimo, fuente, perspectiva, comunidad o
contexto documentado, fecha o periodo cuando corresponda, licencia y revisión
aceptada.

## Estados públicos

- `public`: puede aparecer en catálogo y ficha.
- `restricted`: existe en la base, pero solo se muestra a roles autorizados.
- `sensitive`: no se muestra automáticamente; requiere decisión editorial.
- `community-controlled`: la comunidad participa del alcance y publicación.

La ausencia de un registro público no implica que la ausencia sea un hecho
biológico o cultural.

## Criterios de aceptación de la interfaz

- Una persona puede llegar desde la portada a una especie publicada sin
  conocer IDs internos.
- La ficha separa visualmente taxonomía, observación, cultivo, cultura y
  procedencia.
- Cada afirmación importante muestra su fuente o un estado de falta de fuente.
- Los nombres culturales no aparecen como sinónimos taxonómicos automáticos.
- Los registros restringidos no aparecen en HTML público, mapa, búsqueda ni
  metadatos serializados.
- Los estados vacíos explican qué falta y no presentan fixtures como datos
  reales.
- La navegación funciona en móvil y teclado sin depender de una pestaña no
  documentada.

## Fuera de este corte

No se fija todavía una identidad de marca definitiva, un editor 3D colaborativo,
un sistema de cuentas completo ni una ontología de conocimiento final. El
lenguaje visual operativo del MVP sí queda definido en el contrato v0.1
complementario; la identidad final y sus activos siguen siendo decisiones
posteriores. El modelo actual debe permitirlas.
