# ADR-0007: Experiencia 3D vertical para móvil

**Estado:** Accepted for implementation
**Fecha:** 2026-08-24

## Contexto

WACHUMA no debe presentar la ficha de _Echinopsis pachanoi_ como un blog
tradicional. La experiencia principal debe aprovechar la pantalla vertical del
móvil: el usuario desplaza la página, el cactus gira y cada tramo revela una
capa de conocimiento.

## Decisión

Usaremos un canvas WebGL fijo (`position: sticky`) dentro de una página con
scroll nativo. El texto permanece en HTML accesible y el progreso se normaliza
entre `0` y `1`. El renderer interpola cámara, giro, luz y estados visuales a
partir de capítulos versionados.

```text
scroll nativo
  -> progress 0..1
  -> ScrollExperience
  -> cámara / giro / iluminación
  -> capítulo HTML + fuentes
```

La primera implementación vive en
`apps/web/app/components/EchinopsisScrollExperience.tsx` y usa el GLB que ya
existe como placeholder. El contrato compartido está en
`packages/shared/src/scroll-experience.ts`.

## Alcance inicial

- Una experiencia centrada en _Echinopsis pachanoi_.
- Siete capítulos: identidad, cultivo, ecología, materia/química, historia y
  cultura, parientes/nombres confundidos y procedencia.
- Rotación controlada por scroll sin bloquear el scroll del navegador.
- Fallback geométrico mientras el GLB final no esté disponible.
- `prefers-reduced-motion`, texto HTML y fuentes visibles.

## Pipeline de Blender

Blender y Geometry Nodes permanecen fuera del bundle web. El navegador recibe
GLB; los nodos no se ejecutan en el cliente. La rotación y las transformaciones
de cámara se controlan en Three.js. Shape keys o animaciones glTF se usarán
solo cuando el modelo necesite deformaciones que no puedan resolverse con
transformaciones del renderer.

## Rendimiento

El objetivo inicial es una escena móvil con un GLB de 20.000–80.000 triángulos,
1–3 materiales, texturas de 1K–2K y compresión de malla. Se mantendrá una
versión liviana y se validará con carga en dispositivo real antes de publicar.

## Consecuencias

La experiencia es más expresiva que una ficha de tarjetas, pero el contenido
no puede depender solo del canvas: cada afirmación debe seguir existiendo como
HTML, claim y fuente. La narrativa visual es una interpretación editorial y no
una reconstrucción científica del organismo.
