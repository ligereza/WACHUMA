# `@wachuma/web`

La portada usa una experiencia 3D vertical centrada en `Echinopsis pachanoi`.
El canvas permanece fijo mientras el scroll nativo controla la rotación, la
cámara y la iluminación; el texto de cada capítulo permanece en HTML y enlaza
con capas de procedencia. El contrato está en
`packages/shared/src/scroll-experience.ts` y el componente en
`app/components/EchinopsisScrollExperience.tsx`.

Superficie visual del jardín digital. Las páginas del MVP serán inicio,
explorador, ficha de especie, colección, ejemplar, linaje, cultivo, cultura,
mapa y bibliografía. La bandeja protegida `/admin/review` puede filtrar por
proveedor o ID exacto de source record; FungalTraits muestra sus blockers y no
ofrece aceptación genérica mientras sus mediciones sigan en staging.

## Preview Geometry Nodes → GLB

Con el servidor web levantado, abrir:

`http://127.0.0.1:3000/preview/svg-loft`

La escena activa muestra los GLB horneados desde
`integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend`. El
proyecto fuente usa Geometry Nodes 4.5 para instanciar costillas modulares
`M_i(s,u)`, evaluar areolas y espinas sobre la misma superficie y prolongar un
meristemo apical. El SVG de referencia sólo describe textura interior; no es
una línea temporal ni una colección de estados de crecimiento. El componente
activo es `GeometryNodesPachanoiPreview.tsx`; `SvgLoftPreview.tsx` se conserva
como artefacto legacy y no participa en esta ruta.
