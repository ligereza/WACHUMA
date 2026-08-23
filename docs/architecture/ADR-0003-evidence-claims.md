# ADR-0003: Afirmaciones como capa universal de evidencia

Estado: aceptada

## Contexto

WACHUMA reúne hechos taxonómicos, observaciones contemporáneas, prácticas de
cultivo, fuentes históricas, evidencia arqueológica, conocimiento comunitario
e interpretación editorial. No todos estos contenidos tienen el mismo estatuto
epistemológico y una relación cultural no debe presentarse como un hecho
taxonómico.

## Decisión

Agregar `claims` como una entidad de primera clase. Cada afirmación conserva:

- sujeto y predicado estable;
- objeto textual, entidad, URI o valor estructurado;
- `assertionType` y `evidenceLevel`;
- fuente obligatoria y fuentes secundarias opcionales;
- agente, perspectiva, fecha y estado de revisión;
- visibilidad, licencia y posibilidad de supersesión.

Las relaciones culturales y los claims de manuales siguen siendo entidades de
dominio con sus propias reglas, pero pueden vincularse a esta capa común.

## Consecuencias

- La API pública sólo publica claims `public` y `accepted`.
- La ausencia de fuente no puede pasar la validación de publicación.
- La UI puede explicar “por qué se muestra” cada afirmación.
- El modelo puede exportarse más tarde a PROV-O, JSON-LD o nanopublicaciones.
- El coste es una mayor complejidad de revisión y de consultas, aceptada por la
  necesidad de procedencia explícita.
