# Mapa de fuente procedural de WACHUMA

Este documento congela la ruta que produce y presenta el cactus procedural de
Echinopsis pachanoi. Separa la fuente generativa, los artefactos exportados y
la presentación web. La fecha de esta auditoría es 2026-08-27.

## Ruta activa

```text
apps/web/app/preview/svg-loft/page.tsx
  -> apps/web/app/components/GeometryNodesPachanoiPreview.tsx
  -> apps/web/public/models/pachanoi-sequence/frame-*.glb
```

La página activa no importa `SvgLoftPreview.tsx`. El componente web carga diez
snapshots GLB de la secuencia. El archivo
`apps/web/public/models/pachanoi-sequence/sequence.manifest.json` describe la
procedencia de esos snapshots y el componente lo consulta en runtime para
obtener el listado de assets. El navegador valida la estructura del listado,
pero no vuelve a calcular los hashes SHA-256 de cada GLB; el manifest sigue
siendo el contrato de procedencia versionado, no un sistema de verificación
criptográfica dentro de la GPU.

## Fuente generativa canónica

| Capa            | Ruta                                                                  | Responsabilidad                                                                                                    | Estado                                       |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Generador       | `integrations/blender/generate_pachanoi_geometry_nodes.py`            | Crea el árbol Geometry Nodes, sockets, materiales, módulos rib–valley, areolas, espinas y cierre corporal derivado | Canónica                                     |
| Fuente editable | `integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend` | Conserva el árbol GN y los valores evaluables de Blender                                                           | Canónica                                     |
| Exportador      | `integrations/blender/export_pachanoi_sequence.py`                    | Evalúa frames del mismo `.blend`, exporta GLB y escribe el manifest con hashes, parámetros y sidecar de identidad  | Canónica de exportación                      |
| Secuencia web   | `apps/web/public/models/pachanoi-sequence/frame-*.glb`                | Snapshots horneados para el navegador                                                                              | Derivada                                     |
| Manifest activo | `apps/web/public/models/pachanoi-sequence/sequence.manifest.json`     | Hashes, frames, parámetros, versión, seed, identidad declarada y limitaciones                                      | Derivada, versionada                         |
| Preview         | `apps/web/app/components/GeometryNodesPachanoiPreview.tsx`            | Carga GLB y presenta controles; actualmente también deforma vértices en shaders para redondeo y escala de espinas  | Presentación con aproximación geométrica web |

El GLB no es la fuente primaria: no contiene el árbol GN, sus sockets, la
regla generativa ni la procedencia completa. Su validación glTF tampoco prueba
por sí sola manifoldness, continuidad C², Jacobianos, auto-intersecciones ni
identidad biológica de vértices.

## Artefactos legacy o no activos

Estos archivos pueden ser útiles como experimentos o comparación, pero no
deben corregir ni sustituir la salida canónica:

| Artefacto                                                                | Razón de no-actividad                                                                    |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `apps/web/app/components/SvgLoftPreview.tsx`                             | Preview procedural/analítico anterior; no es importado por la ruta activa                |
| `integrations/blender/svg_to_cactus_mesh.py`                             | Generador histórico basado en la línea SVG; no alimenta la ruta activa                   |
| `integrations/blender/generate_pachanoi_growth_simulation.py`            | Experimento separado de Simulation Zone; no genera los GLB de producción                 |
| `integrations/blender/projects/wachuma-pachanoi-growth-simulation.blend` | Proyecto experimental de crecimiento persistente; no es el `.blend` canónico             |
| `apps/web/public/models/pachanoi-geometry-nodes-frame*.manifest.json`    | Manifests antiguos; no describen la secuencia activa                                     |
| `apps/web/public/animations/echinopsis-rib-progression.svg`              | Referencia cromática/transversal; no define topología, anatomía, frames ni ley biológica |

## Qué está demostrado y qué no

La auditoría reproducible en `.local/audit/implementation-audit-2026-08-28.json`
demostró para el objeto corporal evaluado en Blender en frame 180: un
componente, cero aristas de frontera, cero aristas no-manifold, orientación
consistente y Euler 2. Esto no equivale a una prueba sobre cada primitive del
GLB ni sobre el agregado que incluye areolas y espinas.

El mismo reporte encontró que `rib_id`, `areola_id`, `u`, `delta_theta`,
`local_s` y `birth_frame` no están codificados como atributos del mesh evaluado
ni como atributos glTF. El manifest contiene un sidecar procedural declarado,
pero la correspondencia sidecar–vértice exportado no está demostrada.

La secuencia contiene hashes coincidentes para los diez GLB, versión del
generador, hash del generador, hash del `.blend`, parámetros, seed y estado de
validación. Eso prueba trazabilidad de artefactos, no una ley biológica ni una
identidad geométrica persistente a nivel de vértice.

`GeometryNodesPachanoiPreview.tsx` escribe `transformed` en el vertex shader
para `Inner Rib Roundness` y `Spine Scale`. En consecuencia, la presentación
actual debe describirse como `WEB_GEOMETRY_APPROXIMATION`; no como una vista
puramente material del GLB.

## Flujo de corrección

```text
hipótesis o requisito matemático
  -> generate_pachanoi_geometry_nodes.py
  -> wachuma-pachanoi-geometry-nodes.blend
  -> export_pachanoi_sequence.py
  -> GLB + sequence.manifest.json
  -> GeometryNodesPachanoiPreview.tsx
```

Un cambio de geometría debe comenzar en el generador y regenerar el `.blend`,
los GLB y el manifest. Un cambio exclusivamente visual puede comenzar en el
preview, pero no puede presentarse como corrección del generador. Mientras el
preview deforme vértices, cualquier comparación debe distinguir la salida GLB
de la aproximación final de la GPU.
