# Adaptador externo Blender / Geometry Nodes

Este directorio contiene un adaptador de referencia para ejecutar Blender fuera
del núcleo de WACHUMA. El navegador y la API no importan `bpy`, Geometry Nodes
ni addons GPL: reciben únicamente el GLB y su manifiesto de procedencia.

## Flujo

1. Crear una solicitud que cumpla
   [`procedural-adapter-request.schema.json`](../../schemas/procedural-adapter-request.schema.json).
2. Ejecutar Blender en un entorno aislado:

   ```text
   blender --background --python integrations/blender/generate_wachuma_scene.py -- \
     --request integrations/blender/recipe.example.json
   ```

3. El adaptador escribe el GLB y un manifiesto que cumple
   [`procedural-asset-manifest.schema.json`](../../schemas/procedural-asset-manifest.schema.json).
4. Registrar el `contentHash`, la licencia de Blender/addons y la atribución
   del generador en `SceneAssetProvenance` antes de publicar el asset.

El script de ejemplo construye un cuerpo paramétrico mínimo con un nodo de
Geometry Nodes. Es una representación procedural y no una reconstrucción
taxonómica de un ejemplar. La receta, la semilla y los parámetros permanecen
separados del archivo `.blend` para que otro adaptador pueda reproducirlos.

## Límite de licencias

Blender y el código GPL/CeCILL que se use en un worker externo conservan sus
licencias originales. Este repositorio no copia addons, módulos ni datasets de
Blender, OpenAlea/L-Py, Arbaro o Sverchok. El resultado GLB es un artefacto
separado y debe llevar su propia licencia y atribución; la licencia del
software que lo generó no se hereda automáticamente al modelo.

El adaptador de referencia es opcional, no es una dependencia de `apps/web` y
se ejecuta como proceso separado. La ejecución de verificación registrada para
este MVP está en
[`docs/quality/procedural-adapter-run.md`](../../docs/quality/procedural-adapter-run.md).
