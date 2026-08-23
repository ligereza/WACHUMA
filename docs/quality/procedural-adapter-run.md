# Verificación del adaptador procedural Blender

El adaptador externo se ejecutó el 2026-08-21 en un entorno WSL Ubuntu
compartido con el checkout:

- Blender `5.0.1`.
- Python embebido `3.14.4`.
- `numpy` `2.3.5`, requerido por el exportador glTF de Blender.
- Receta: `recipe-blender-geometry-nodes-echinopsis-demo`.
- Semilla: `304`.

Comando ejecutado:

```text
blender --background --python integrations/blender/generate_wachuma_scene.py -- \
  --request integrations/blender/recipe.example.json
```

El resultado se generó en `.local/blender-run/`, que está ignorado porque es
un resultado de verificación temporal. El manifiesto registró:

- `contentHash`: `e521b0469286c2197b6f4b1f4eb4bb56c85fa9cf9b087f6ef5a54b1f583dd04e`.
- `adapterBoundary`: `external-process`.
- `representationType`: `procedural-interpretation`.
- GLB de `6268` bytes, una primitiva y cero animaciones.

`pnpm validate:glb .local/blender-run/echinopsis-pachanoi-blender.glb` pasó con
cero errores, advertencias y sugerencias. El hash SHA-256 del archivo coincide
con el manifiesto. La geometría es una interpretación procedural y no una
reconstrucción taxonómica ni un registro de un ejemplar real.

El asset público de la web continúa siendo el generado por el adaptador propio
MIT de WACHUMA. Esta ejecución externa verifica la frontera de integración sin
convertir Blender, `bpy` ni sus addons en dependencias del núcleo.
