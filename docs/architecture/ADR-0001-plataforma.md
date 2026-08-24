# ADR-0001: Plataforma modular para el jardín digital biocultural

**Estado:** Accepted  
**Fecha:** 2026-08-21  
**Decisores:** mantenedores de WACHUMA

## Contexto

WACHUMA necesita servir una experiencia visual de jardín y, al mismo tiempo,
mantener datos relacionales rigurosos sobre taxonomía, organismos, ejemplares,
linajes, cultivo, ecología, cultura, fuentes y procedencia.

Las restricciones principales son:

- PostgreSQL y PostGIS deben ser la fuente de verdad del MVP.
- La API debe poder documentarse y consumirse por clientes externos.
- Las relaciones deben poder proyectarse a un knowledge graph sin reconstruir
  todo el modelo.
- El conocimiento cultural debe tener procedencia explícita y controles de
  sensibilidad.
- No se incorpora código AGPL/GPL de Arches, farmOS, Enveda o Mycodo.
- OpenFarm se estudia como concepto, pero no se usa como backend.
- El MVP no incluye IA, visión computacional ni sensores.

## Decisión

Construir un monorepo TypeScript con un monolito modular y tres aplicaciones:

| Componente      | Decisión                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`      | Next.js/React para páginas públicas, navegación visual y renderizado híbrido.                                                            |
| `apps/api`      | Fastify + Zod + OpenAPI para REST `/api/v1`.                                                                                             |
| `apps/worker`   | Worker Node.js para imports y tareas asíncronas; `pg-boss` usa PostgreSQL y evita introducir Redis en el MVP.                            |
| Persistencia    | PostgreSQL + PostGIS; Drizzle ORM para tipos y migraciones SQL revisables.                                                               |
| Identidad       | UUIDv7 generado por la aplicación cuando esté disponible, UUIDv4 como fallback de PostgreSQL y `public_id` estable legible para QR/URLs. |
| Mapas           | MapLibre en el cliente y proveedor de tiles configurable; la atribución del proveedor se renderiza siempre.                              |
| Búsqueda        | PostgreSQL full-text + `pg_trgm` en el MVP; motor dedicado después si el volumen lo exige.                                               |
| Contenido       | Registros estructurados en DB; textos editoriales y ejemplos versionados en `content/`.                                                  |
| Knowledge graph | Exportación futura de aristas a JSON-LD/RDF; no se añade una base de grafos al MVP.                                                      |

Las entidades que son relaciones de dominio —linaje, procedencia, relaciones
culturales, adjuntos y fuentes— se modelan como filas con identificadores
estables. El modelo evita una tabla “texto libre” que mezcle hecho taxonómico,
observación, historia e interpretación editorial.

## Opciones consideradas

### A. Monolito modular TypeScript + PostgreSQL/PostGIS — elegida

| Dimensión       | Evaluación                                                        |
| --------------- | ----------------------------------------------------------------- |
| Complejidad     | Media-baja                                                        |
| Coste operativo | Bajo                                                              |
| Escalabilidad   | Suficiente para el MVP; separa worker y API cuando crece la carga |
| Familiaridad    | Alta para web y tipos compartidos                                 |

**Ventajas:** transacciones consistentes, migraciones en un lugar, contratos
TypeScript compartidos, fácil despliegue self-hosted y camino claro a
exportaciones JSON-LD.

**Costes:** requiere disciplina de límites de módulos y no ofrece aislamiento
fuerte entre dominios.

### B. Microservicios por taxonomía, cultivo, cultura y medios

**Ventajas:** aislamiento y despliegues independientes.

**Costes:** duplica autenticación, observabilidad, migraciones y contratos en
una fase donde la prioridad es el modelo de procedencia. Se pospone.

### C. Adoptar farmOS o Arches como backend

**Ventajas:** vocabularios y funcionalidades maduras.

**Costes:** acoplamiento a plataformas y obligaciones de licencia GPL/AGPL;
además, sus modelos no cubren por sí solos genealogía de clones, material
biológico, fuentes culturales sensibles y capas editoriales. Se estudian sus
conceptos, no se integran sus tablas ni código.

### D. Empezar con Wikibase o una base de grafos

**Ventajas:** aristas y entidades encajan naturalmente con Linked Open Data.

**Costes:** más complejidad de edición, validación, permisos, migraciones y
hosting; la experiencia de jardín y los registros privados se vuelven más
difíciles de mantener. Se reserva una proyección a JSON-LD/RDF.

## Consecuencias

- La base relacional será la fuente de verdad y cada arista tiene un ID estable.
- La API podrá ofrecer recursos REST y una exportación de grafo sin rediseñar
  los dominios.
- La procedencia y la sensibilidad son parte del modelo, no solo de la interfaz.
- Habrá tablas de unión y checks de integridad para evitar relaciones
  polimórficas sin control.
- La autenticación y edición colaborativa requieren un ADR posterior.
- Deberá existir una política de actualización para taxonomía externa, porque
  no se duplicará toda la taxonomía de GBIF/POWO/iNaturalist.

## Guardrails de licencia y datos

1. No se copia código de repositorios GPL/AGPL al árbol de WACHUMA.
2. Los datos externos entran solo mediante importadores que crean
   `data_sources`, `source_records` y `record_provenance`.
3. Una imagen iNaturalist se muestra o almacena solo si su licencia y
   atribución individuales lo permiten.
4. Los registros `sensitive` y `community-controlled` requieren revisión antes
   de publicarse.

## Acciones

1. [x] Aprobar licencia del código y política de contenido.
2. [x] Implementar migración inicial y checks de sensibilidad/procedencia.
3. [x] Publicar OpenAPI y tipos compartidos.
4. [x] Implementar el importador GBIF con un snapshot reproducible en staging.
5. [x] Implementar autenticación protegida, moderación y takedown mínimos para
       el MVP; la identidad multiusuario queda para una fase posterior.
6. [x] Implementar el importador iNaturalist con licencia por observación/media,
       proyección restringida, geoprivacidad y revisión editorial separada.
7. [x] Implementar el importador Wikidata de claims estructurados e
       identificadores, con `external_identifier_id` como target de
       procedencia revisable y sin copiar texto o multimedia.
