# Mapa de fuente procedural de WACHUMA

Este documento congela la ruta que produce y presenta el cactus procedural de
Echinopsis pachanoi. Separa la fuente generativa, los artefactos exportados y
la presentación web. La fecha de esta auditoría es 2026-08-27.

## Ruta activa

```text
apps/web/scripts/generate-demo-glb.ts
  -> packages/procgen/src/pachanoi-surface.ts
  -> apps/web/public/models/echinopsis-pachanoi-demo.glb
  -> apps/web/app/components/Garden3DPreview.tsx
```

La ruta de desarrollo apical mantiene una segunda salida comparativa:

```text
integrations/blender/export_pachanoi_sequence.py
  -> apps/web/public/models/pachanoi-sequence/frame-*.glb
  -> apps/web/app/components/GeometryNodesPachanoiPreview.tsx
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

| Capa               | Ruta                                                                  | Responsabilidad                                                                                                       | Estado                            |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Generador procgen  | `packages/procgen/src/pachanoi-surface.ts`                            | Produce la superficie cerrada de costillas, la retícula de areolas y las espinas con semilla y parámetros versionados | Canónica in-process               |
| Exportador Node    | `apps/web/scripts/generate-demo-glb.ts`                               | Convierte la superficie procgen a GLB, escribe hash/manifiesto y no necesita Blender                                  | Canónica de exportación           |
| Asset demo         | `apps/web/public/models/echinopsis-pachanoi-demo.glb`                 | Malla corporal cerrada más areolas/espinas para la escena del jardín                                                  | Derivada, versionada              |
| Manifest demo      | `apps/web/public/models/echinopsis-pachanoi-demo.manifest.json`       | Semilla, algoritmo, diagnósticos, topología, licencia, atribución y diferencia con Blender                            | Derivada, versionada              |
| Preview jardín     | `apps/web/app/components/Garden3DPreview.tsx`                         | Carga el GLB generado in-process; la escena sigue siendo una interpretación procedural                                | Presentación con aproximación web |
| Generador Blender  | `integrations/blender/generate_pachanoi_geometry_nodes.py`            | Conserva la hipótesis Geometry Nodes y sus snapshots de desarrollo                                                    | Comparación externa               |
| Fuente editable    | `integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend` | Valores evaluables del adaptador Blender                                                                              | Comparación externa               |
| Exportador Blender | `integrations/blender/export_pachanoi_sequence.py`                    | Exporta la secuencia animada comparativa y su manifest                                                                | Comparación externa               |
| Secuencia Blender  | `apps/web/public/models/pachanoi-sequence/frame-*.glb`                | Snapshots de desarrollo apical para el preview especializado                                                          | Derivada, externa                 |

El GLB no es la fuente primaria: no contiene la regla generativa ni la
procedencia completa. `pnpm quality:procgen-glb` regenera dos veces el asset
desde `@wachuma/procgen`, compara sus bytes y hash, y comprueba cuerpo cerrado,
aristas de frontera/no-manifold, orientación, degenerados, siete costillas y
auto-intersecciones por SAT espacial. `pnpm validate:glb` comprueba la
especificación glTF; `pnpm quality:topology` mantiene la misma auditoría para
la secuencia Blender comparativa. Ninguno de los gates prueba continuidad C²,
identidad biológica de vértices ni una reconstrucción científica.

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

El asset procgen contiene un hash estable para la misma semilla y un manifiesto
con diagnósticos de superficie. La secuencia Blender contiene además hash del
generador y del `.blend`; ambas rutas prueban trazabilidad de artefactos, no una
ley biológica ni una identidad geométrica persistente a nivel de vértice.

`GeometryNodesPachanoiPreview.tsx` escribe `transformed` en el vertex shader
para `Inner Rib Roundness` y `Spine Scale`. En consecuencia, la presentación
actual debe describirse como `WEB_GEOMETRY_APPROXIMATION`; no como una vista
puramente material del GLB.

## Flujo de corrección

```text
hipótesis o requisito matemático
  -> packages/procgen/src/pachanoi-surface.ts
  -> apps/web/scripts/generate-demo-glb.ts
  -> GLB + echinopsis-pachanoi-demo.manifest.json
  -> Garden3DPreview.tsx

comparación de desarrollo (opcional, Blender externo)
  -> generate_pachanoi_geometry_nodes.py
  -> wachuma-pachanoi-geometry-nodes.blend
  -> export_pachanoi_sequence.py
  -> GLB + sequence.manifest.json
  -> GeometryNodesPachanoiPreview.tsx
```

Un cambio de geometría canónica debe comenzar en `packages/procgen` y regenerar
el GLB demo y su manifest con `pnpm --filter @wachuma/web generate:demo-model`.
La secuencia Blender sólo se regenera en el adaptador externo para comparar el
desarrollo apical; sus bytes no son requisito del núcleo. Un cambio
exclusivamente visual puede comenzar en el preview, pero no puede presentarse
como corrección del generador. Mientras el preview Blender deforme vértices,
cualquier comparación debe distinguir la salida GLB de la aproximación final
de la GPU.
