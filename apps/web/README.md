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
