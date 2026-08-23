# Generadores procedurales y límites de integración

WACHUMA separa la receta reproducible, el proceso que genera geometría y el
asset publicado. El núcleo conserva `algorithm`, `algorithmVersion`, `seed`,
`parameters`, `constraints`, licencia, atribución y hash; el navegador solo
consume GLB/glTF. Un generador externo nunca se convierte en una dependencia
de `apps/web`.

## Selección por función

| Herramienta                         | Función potencial                             | Tratamiento en WACHUMA                                                    |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Three.js + React Three Fiber + Drei | Visor, cámara, controles y composición web    | Dependencias MIT del núcleo web                                           |
| Blender Geometry Nodes              | Generación artística y nodal, exportación GLB | Adaptador externo; Blender mantiene GPL-2.0-or-later                      |
| OpenAlea PlantGL / L-Py             | Modelos botánicos y L-systems                 | Worker externo de investigación; revisar CeCILL/CeCILL-C por distribución |
| ngPlant                             | Árboles y estructuras procedurales            | Adaptador opcional; separar core BSD de aplicaciones GPL                  |
| Arbaro                              | Árboles paramétricos y XML de recetas         | Referencia o proceso aislado; no dependencia del MVP, GPL-2.0             |
| Sverchok                            | Prototipos nodales dentro de Blender          | No se copia el addon; usar solo mediante Blender externo, GPL-3.0         |
| glTF-Transform                      | Optimización, inspección y pipeline de assets | Herramienta de build, MIT                                                 |
| Khronos glTF Validator              | Validación formal de GLB/glTF                 | Puerta de CI, Apache-2.0                                                  |

Las licencias son del software concreto y no se transfieren automáticamente a
los datos, modelos, texturas o salidas generadas. Cada asset conserva su
licencia y atribución propias.

## Contrato

- Entrada: [`procedural-adapter-request.schema.json`](../../schemas/procedural-adapter-request.schema.json).
- Salida: [`procedural-asset-manifest.schema.json`](../../schemas/procedural-asset-manifest.schema.json).
- Ejemplo Blender: [`integrations/blender/`](../../integrations/blender/).

El manifiesto declara si la salida se produjo `in-process` o mediante un
`external-process`, el runtime, repositorio, licencia, atribución, semilla,
hash y si existe una afirmación taxonómica. La salida demo propia usa
`in-process`; el adaptador Blender usa `external-process`.

## Reglas de seguridad y reproducibilidad

1. No ejecutar código de Blender, addons o workers CeCILL/GPL dentro del API o
   del navegador.
2. Limitar parámetros, tiempo, memoria y tamaño del GLB cuando se habilite un
   worker externo.
3. Validar el hash del GLB, el manifiesto y la licencia antes de asociar un
   `SceneAsset` público.
4. Mantener la receta y el manifiesto junto al snapshot de escena; el `.blend`
   es un artefacto de trabajo, no la fuente de verdad.
5. Etiquetar las salidas como `procedural-interpretation` salvo que exista
   evidencia y una revisión que justifique otra representación.
