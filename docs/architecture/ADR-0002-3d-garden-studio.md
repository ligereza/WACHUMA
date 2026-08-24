# ADR-0002: Diseño 3D y generación procedural del jardín

**Estado:** Accepted for implementation  
**Fecha:** 2026-08-21  
**Decisores:** mantenedores de WACHUMA

## Objetivo

Añadir una capa visual y generativa para diseñar jardines, visualizar
ejemplares y representar organismos mediante escenas 3D reproducibles, sin
mezclar una interpretación geométrica con un hecho taxonómico, una observación
ni una fotografía de un ejemplar real.

La unidad visual de una ficha será además un `MaterialFixture`: una luminaria o
estudio de materia que puede relacionar forma, cultivo y química mediante
bindings explícitos, sin presentar una propiedad PBR como medición científica.

## Alcance de esta decisión

La primera entrega incluye:

1. Modelo persistible de escenas, objetos, assets y recetas.
2. Recetas procedurales deterministas con semilla y versión.
3. Visor web de escenas 3D.
4. Caso demostrativo de `Echinopsis pachanoi`.
5. Procedencia, licencia, atribución y visibilidad para cada asset.

Quedan fuera de esta entrega el simulador fisiológico de crecimiento, la
visión computacional, sensores, realidad aumentada y un editor colaborativo.

## Decisión técnica

El navegador usará Three.js con React Three Fiber y cargará glTF/GLB. La escena
de dominio se conservará en JSON versionado y no se codificará únicamente en un
archivo de Blender. La base PostgreSQL seguirá siendo la fuente de verdad para
la escena, sus objetos y sus vínculos biológicos.

```text
GardenScene
 ├── GardenSceneAsset ─── SceneAsset ─── Source / provenance
 ├── SceneObject ─── Specimen
│                └─ BiologicalEntity
 ├── ProceduralRecipe ─── SceneAsset
 └── Location
```

Blender Geometry Nodes será un adaptador externo que recibe una receta JSON y
devuelve GLB más un manifiesto. OpenAlea/L-Py, ngPlant, Arbaro y Sverchok se
mantendrán como herramientas de investigación o workers aislados hasta que se
revise la licencia exacta de cada distribución.

El contrato portable de entrada y salida está en
`schemas/procedural-adapter-request.schema.json` y
`schemas/procedural-asset-manifest.schema.json`. La implementación de
referencia vive en `integrations/blender/`; no se importa en `apps/web`,
`apps/api` ni `packages/procgen`.

## Modelo conceptual

### `GardenScene`

Representa una composición espacial versionada. Puede apuntar a un
`Location`, pero su sistema de coordenadas local no sustituye la geometría
geográfica protegida de ese lugar.

### `SceneObject`

Representa una instancia visual dentro de una escena. Puede apuntar a un
`Specimen` real o a un `BiologicalEntity` abstracto. Conserva transformación,
visibilidad y el tipo de representación.

### `SceneAsset`

Representa el archivo visual descargable: GLB, glTF, textura, thumbnail o
archivo de trabajo. Su hash permite detectar cambios y su licencia acompaña al
asset en cualquier exportación.

### `ProceduralRecipe`

Representa la definición reproducible de una geometría. Incluye algoritmo,
versión, semilla, parámetros, restricciones, fuentes y asset generado.

### `SceneSnapshot`

Congela una versión de la composición para que una escena histórica no cambie
cuando se edite la versión actual.

## Generación propia

El paquete `packages/procgen` será código propio y usará métodos matemáticos
documentados:

- geometría paramétrica para cactus y hongos;
- filotaxis para areolas, hojas o espinas;
- L-systems para ramificaciones;
- tropismo para orientación ambiental;
- distribución Poisson-disc para composición de jardín;
- semillas deterministas y límites de complejidad.

La generación no afirmará que una planta virtual es una reconstrucción
científica exacta. El campo `representationType` hará explícita la diferencia.

La primera exportación se produce con `apps/web/scripts/generate-demo-glb.ts`.
El archivo y su manifest viven en `apps/web/public/models/`; el hash del asset
se copia al fixture de escena y se valida con el paquete oficial de Khronos.

## Licencias

- Código del núcleo 3D y recetas propias: licencia del proyecto WACHUMA.
- Three.js, React Three Fiber y Drei: conservar avisos MIT.
- glTF: usar el estándar y conservar la atribución de los assets concretos.
- Blender y Geometry Nodes: integración externa; sus addons y scripts deben
  respetar GPL.
- OpenAlea/L-Py: no vincular al paquete web; CeCILL/CeCILL-C exige revisión
  antes de redistribuir modificaciones o un runtime combinado.
- Modelos, texturas, HDRI y ejemplos: licencia individual, nunca heredada de
  la librería que los carga.

## Consecuencias

La integración puede empezar con un visor y una receta propia sin depender de
Blender. A cambio, el editor avanzado tardará más y habrá que mantener dos
contratos: la receta portable y el asset renderizado.

## Criterios de aceptación

- Una escena puede validarse con `garden-scene.schema.json`.
- Una receta idéntica produce la misma estructura procedural.
- Cada asset tiene hash, licencia, atribución y visibilidad.
- Un objeto visual puede abrir la ficha del ejemplar o entidad asociada.
- La geometría exacta de un lugar sensible nunca se expone por el visor público.
