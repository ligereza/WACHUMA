# Roadmap del MVP

## Fase 0 — diseño y gobernanza

**Salida:** este conjunto de documentos.

- [x] Estudio de referencias y licencias.
- [x] ADR de arquitectura.
- [x] ERD y reglas de integridad.
- [x] Esquema de procedencia y visibilidad.
- [x] Estructura del monorepo.
- [x] Aprobación de licencia base de código/contenido (`MIT` + `CC BY 4.0`);
      las excepciones por registro siguen vigentes.
- [x] Política de revisión comunitaria y takedown.

## Fase 1 — fundación técnica

- [x] Crear workspaces `apps/*`, `packages/*`, `importers/*`.
- [x] Habilitar PostgreSQL/PostGIS y migraciones SQL `0001`–`0003`.
- [x] Implementar tipos compartidos, enums, validación Zod y errores API.
- [x] Crear OpenAPI con health check y endpoints de lectura.
- [x] Añadir fixtures privados ficticios del jardín.

**Criterio de salida:** `pnpm test`, migraciones limpias desde cero y `/api/v1/health` funcionando.

## Fase 1.5 — escenas 3D y generación procedural

- [x] ADR de escenas, assets, recetas y límites de licencia.
- [x] Esquema JSON y tipos compartidos para escenas versionadas.
- [x] Migración inicial para `GardenScene`, `SceneObject`, `SceneAsset` y
      `ProceduralRecipe`.
- [x] Paquetes `scene3d` y `procgen` en el monorepo.
- [x] Receta determinista inicial para distribución de areolas de cactus.
- [x] Composición espacial determinista Poisson-disc para distribuir
      ejemplares con semilla, límites y distancia mínima.
- [x] Vista 3D demostrativa en la portada con ejemplares ficticios.
- [x] Contrato API para listar y proyectar escenas públicas.
- [x] Asset GLB reproducible con manifest, hash SHA-256 y validación glTF.
- [x] Persistir la escena demo mediante seed idempotente y lectura pública desde
      API/PostgreSQL (con fixture en memoria como fallback de desarrollo).
- [x] Asociar el asset persistido con `Media`, `Source` y
      `SceneAssetProvenance` en PostgreSQL.
- [x] Editor local de composición con movimiento, escala, rotación y
      exportación de snapshots JSON; la edición colaborativa/autenticada queda
      para una fase posterior.
- [x] Contrato y adaptador externo de referencia Blender/Geometry Nodes.
- [x] Ejecutar el adaptador aislado en un entorno con Blender instalado y
      registrar el GLB y su manifiesto; la web no depende de esa ejecución.

**Criterio de salida:** una escena local puede abrirse en web, vincular sus
objetos a ejemplares y regenerar una representación con la misma receta.

## Fase 2 — taxonomía y explorador

- [x] Implementar `Taxon`, `BiologicalEntity`, `ExternalIdentifier`.
- [x] Crear explorador con búsqueda por nombre científico, sinónimo, nombre
      vernáculo y namespace externo.
- [x] Implementar importador y comando reproducible de snapshot GBIF para
      _Echinopsis pachanoi_; los snapshots locales quedan `pending-license-review`
      hasta revisar licencia por registro y multimedia.
- [x] Renderizar ficha de especie con taxonomía, distribución y fuentes.

**Criterio de salida:** una ficha puede distinguir nombre aceptado, sinónimo,
identificador externo, fuente y fecha de sincronización.

## Fase 3 — jardín, ejemplares y linajes

- [x] CRUD protegido de `Location`, `Specimen` y `SpecimenLocation`, con
      archivado reversible y separación entre geometría pública y exacta.
- [x] Ficha de ejemplar con código público y QR.
- [x] Registrar ejemplares ficticios de _E. pachanoi_ sin datos privados reales.
- [x] Implementar árbol de `LineageRelationship` para `cutting_of`, `clone_of`,
      `seed_from` y `cross_of`.

**Criterio de salida:** el árbol muestra procedencia sin exponer la ubicación
exacta de ejemplares privados.

## Fase 4 — cultivo

- [x] `GrowingGuide` versionado por clima, técnica, región y autor.
- [x] `GrowingGuideClaim` por afirmación técnica con fuente/evidencia.
- [x] `CultivationEvent` para riego, trasplante, propagación, plagas,
      fructificación, cosecha y observaciones.
- [x] Página de manuales y timeline de eventos del ejemplar público demo.

**Criterio de salida:** una guía puede tener múltiples versiones y cada sección
importante enlaza bibliografía cuando existe.

## Fase 5 — cultura, fuentes y mapa

- [x] `Community`, `Place`, `HistoricalPeriod`, `Source` y `CulturalRelation`.
- [x] Formulario protegido de relación cultural con `evidenceLevel`, perspectiva,
      sensibilidad, licencia, revisión y contexto comunitario.
- [x] Página de bibliografía/fuentes con atribución visible.
- [x] Mapa con geometría pública, redondeo y filtros de sensibilidad.
- [x] Nombres “wachuma”, “huachuma” y “San Pedro” como relaciones culturales
      contextualizadas; no como sinónimos automáticos de taxonomía.

**Criterio de salida:** ninguna afirmación cultural aparece sin fuente y una
relación restringida no aparece en el mapa público.

## Fase 6 — importador GBIF y release

- [x] Worker con job explícito, persistencia idempotente y `source_records`
      inmutables, cola PostgreSQL, singleton key, backoff y dead-letter.
- [x] Importar taxonomía, ocurrencias/distribución y multimedia declarada por
      GBIF como staging con licencia y atribución por registro; la publicación
      sigue bloqueada hasta revisión.
- [x] Producir `THIRD_PARTY.md` y conservar un gate de licencias/atribuciones;
      el export específico de cada release queda automatizable después.
- [x] Tests de regresión para licencias, coordenadas, contenido y procedencia.

**Criterio de salida:** un snapshot puede repetirse y producir los mismos
registros normalizados sin perder el payload original.

## Fase 7 — evidencia, interoperabilidad y crecimiento procedural

- [x] `Claim` universal con fuente obligatoria, evidencia, perspectiva,
      revisión y visibilidad.
- [x] Eventos de derivación y materiales con entradas/salidas explícitas para
      esquejes, semillas, clones, cultivos, aislados, injertos y spawn.
- [x] Protocolos y mediciones de traits con incertidumbre y fuente.
- [x] Adaptadores puros para Darwin Core, JSON-LD/PROV-O y RO-Crate.
- [x] `PlantDescriptor` versionado con semilla, parámetros, fuentes y etiqueta
      de interpretación procedural.
- [x] ADRs, ERD, matriz de licencias y documentación de decisiones derivadas
      del research.
- [x] Configurar workflow de CI con PostgreSQL/PostGIS efímero y el mismo
      release gate.
- [ ] Ejecutar el workflow en CI y conservar su registro reproducible.

**Criterio de salida:** una exportación pública puede reconstruirse desde DTOs
filtrados sin perder identidad, fuente, licencia, incertidumbre o separación
entre hecho, observación e interpretación.

## Fuera del MVP

- IA, identificación visual y computer vision.
- Sensores y automatización Mycodo.
- Wikibase/graph database como almacenamiento primario.
- Marketplace, pagos y distribución de material biológico.
- Publicación automática de conocimiento cultural sensible.

## Orden de páginas

1. Inicio.
2. Explorador de especies.
3. Ficha de especie.
4. Colección/jardín.
5. Ficha de ejemplar.
6. Árbol de linaje.
7. Manuales de cultivo.
8. Sección cultural.
9. Mapa.
10. Bibliografía y fuentes.
11. Estudio 3D del jardín.
