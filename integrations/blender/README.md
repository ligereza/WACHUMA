# Adaptador externo Blender / Geometry Nodes

Este directorio contiene un adaptador de referencia para ejecutar Blender
fuera del núcleo de WACHUMA. El navegador y la API reciben el GLB y su
manifiesto de procedencia; no importan `bpy`, Geometry Nodes ni addons GPL.

## Flujo

1. Crear una solicitud que cumpla
   [`procedural-adapter-request.schema.json`](../../schemas/procedural-adapter-request.schema.json).
2. Ejecutar Blender en un entorno aislado:

   ```text
   blender --background --python integrations/blender/generate_wachuma_scene.py -- --request integrations/blender/recipe.example.json
   ```

3. El adaptador escribe el GLB y un manifiesto que cumple
   [`procedural-asset-manifest.schema.json`](../../schemas/procedural-asset-manifest.schema.json).
4. Registrar `contentHash`, licencia y atribución antes de publicar el asset.

Blender y cualquier código GPL/CeCILL conservan sus licencias originales. Este
repositorio no copia addons, módulos ni datasets de Blender, OpenAlea/L-Py,
Arbaro o Sverchok.

## SVG de costillas a malla cerrada

[`svg_to_cactus_mesh.py`](svg_to_cactus_mesh.py) usa el SVG sólo como referencia
transversal y construye `n` módulos de costilla, `n` módulos de valle y una
terminación meristemática derivada de esos módulos. El campo agregado
`R+A f_n(θ-Φ)` sirve para describir la sección, no para generar un tubo al que
se le añade un cap. Las spines, anchos, relieves, valles y areolas se conservan
como entidades auditables.

Validación sin iniciar Blender:

```text
python integrations/blender/svg_to_cactus_mesh.py --svg apps/web/public/animations/echinopsis-rib-progression.svg --frame 4 --validate-only
```

Exportación GLB:

```text
blender --background --python integrations/blender/svg_to_cactus_mesh.py -- --svg apps/web/public/animations/echinopsis-rib-progression.svg --frame 4 --height 2.4 --radius 0.38 --rib-count 8 --apical-ratio 0.23 --apical-segments 24 --angular-segments 96 --meristem-radius-ratio 0.46 --meristem-height-ratio 0.28 --residual-amplitude-ratio 0 --out .local/blender-run/echinopsis-pachanoi-modular.glb
```

La exportación también escribe el sidecar `.areoles.json`. Conserva la
procedencia y los parámetros de cada areola; no convierte una posición
generada en una observación botánica.

## Proyecto modular paramétrico en Geometry Nodes 4.5 (referencia)

[`generate_pachanoi_geometry_nodes.py`](generate_pachanoi_geometry_nodes.py)
conserva la versión paramétrica anterior para comparación. No lee el SVG ni lo convierte en una falsa
secuencia de crecimiento. La unidad geométrica es una costilla paramétrica:

```text
M_i(s,u) = rotate_y(i * 2*pi/n) M_0(s,u)
u in [-1,1], s in [0,1]
```

El árbol crea un `Mesh Grid` como dominio material de una costilla, lo evalúa
con las ecuaciones de `SvgLoftPreview.tsx`, instancia `n` módulos con
`Instance on Points`, y usa la misma evaluación para areolas y siete slots de
espina por nodo —con longitudes muy diferentes—. El socket experimental de
brote lateral permanece en el árbol para no romper compatibilidad, pero la
referencia visual aprobada lo fuerza a `0.0`: no se genera ningún brazo. El
crecimiento visible es apical; hidratación y advección regular de areolas son
entradas del grupo Geometry Nodes, no frames SVG.

Comando reproducible con Blender 4.5.x:

```text
blender --background --python integrations/blender/generate_pachanoi_geometry_nodes.py -- --out apps/web/public/models/pachanoi-geometry-nodes-development.glb --blend-out integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend
```

Para reproducir la animación en la web, Blender 4.5 evalúa el mismo `.blend`
en frames discretos y exporta snapshots, porque el exportador glTF no conserva
el modificador Geometry Nodes animado como un clip nativo:

```text
blender --background integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend --python integrations/blender/export_pachanoi_sequence.py -- --out-dir apps/web/public/models/pachanoi-sequence --frames 1,24,48,72,96,118,130,145,160,180
```

La secuencia no es un segundo modelo: cada snapshot se evalúa desde el mismo
árbol de meristemos, módulos, areolas y espinas del `.blend`.

El `.blend` es la fuente editable y conserva el grupo
`WACHUMA_Pachanoi_Modular_GeometryNodes_45`; el GLB es la malla horneada para
la web. `echinopsis-rib-progression.svg` queda como referencia visual de la
textura interior: un núcleo de pulpa verde clara, una transición intermedia y
pulpa exterior más oscura. No define tiempo, número de costillas durante el
crecimiento ni una ley biológica medida.

Los controles editables se ordenan en cuatro familias: desarrollo apical;
forma de costilla (`Inner Rib Roundness` eleva suavemente el fondo del valle);
pulpa SVG (`Pulp Core Radius`, `Pulp Contrast`); y areolas/espinas (`Spine
Scale`, además de longitud, curvatura y radio). El preview web aplica estos
cuatro controles en tiempo real sobre los snapshots mediante uniforms y
deformación de vértices; el `.blend` los conserva como sockets equivalentes
para regenerar el GLB.

La implementación paramétrica usa los nodos documentados por Blender 4.5:
[Position](https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/geometry/read/position.html),
[Set Position](https://docs.blender.org/manual/id/4.5/modeling/geometry_nodes/geometry/write/set_position.html),
[Instance on Points](https://docs.blender.org/manual/uk/4.5/modeling/geometry_nodes/instances/instance_on_points.html)
y [Mesh Grid](https://docs.blender.org/UATEST/manual/en/4.5/modeling/geometry_nodes/mesh/primitives/grid.html).

## Experimento generativo con estado persistente (no usado en el preview)

[`generate_pachanoi_growth_simulation.py`](generate_pachanoi_growth_simulation.py)
es un experimento separado para estudiar estado persistente. No es la base
visual aprobada ni debe sustituir al `.blend` paramétrico anterior. No anima un tubo terminado:
una `Simulation Zone` conserva una geometría de estado con un punto por brote
y estos atributos:

```text
shoot_id, parent_id, birth_frame, age, front, shoot_radius,
height, growth_rate, child_exists, is_child, axis
```

En cada paso se integra el frente meristemático. En el frame 72 una regla
idempotente añade exactamente un nuevo punto hijo desde la coordenada de una
areola parental; antes de ese frame el hijo no existe. La visualización
instancia el módulo local de costillas, areolas y espinas desde esos puntos y
realiza instancias sólo en el límite final de render/exportación.

Generación reproducible:

```text
blender --background --factory-startup --python integrations/blender/generate_pachanoi_growth_simulation.py
```

Proyecto editable:
`integrations/blender/projects/wachuma-pachanoi-growth-simulation.blend`.
Abre en el frame 1 y avanza la línea de tiempo; saltar directamente a un
frame posterior inicializa una Simulation Zone nueva en ese frame y no es una
validación causal válida.

Validación de nacimiento, persistencia y crecimiento:

```text
blender --background integrations/blender/projects/wachuma-pachanoi-growth-simulation.blend --python integrations/blender/validate_pachanoi_growth_simulation.py
```

La validación esperada es: `shoot_id=[0]` en el frame 71, `shoot_id=[0,1]`
desde el frame 72, `birth_frame=[1,72]` después del nacimiento y un `front`
del hijo que crece desde `0.035` hasta `1.0`. Esto prueba el mecanismo de
generación; no pretende convertir todavía las reglas visuales en parámetros
botánicos medidos.
