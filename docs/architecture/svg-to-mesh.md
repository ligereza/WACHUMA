# Malla modular de costillas, valles y meristemo terminal (legacy)

> **Estado:** documento histórico y herramienta de comparación. No es el
> flujo activo de `/preview/svg-loft`. La fuente canónica actual es
> `integrations/blender/generate_pachanoi_geometry_nodes.py`, su proyecto
> `.blend` y la secuencia `pachanoi-sequence/`. Consulta el [mapa de fuente
> procedural](procedural-asset-source-map.md) antes de modificar geometría.

`echinopsis-rib-progression.svg` es una referencia transversal. El SVG se usa
para estimar `R`, `A` y una fase inicial; no se extruye directamente y tampoco
es la ontología de la superficie.

## Primitiva generativa

La superficie se construye con `n` módulos de costilla y `n` módulos de valle.
Para cada costilla estable `rib_id=i`:

```text
theta_i(z) = Phi(z) + 2*pi*i/n
c_i(z)     = rho_i(z) * e_r(theta_i(z)) + z*e_z
```

Cada módulo conserva spine, ancho, relieve, fase y perfil transversal local.
En una sección, si `delta` es la distancia angular firmada a la spine más
cercana:

```text
g_rib(delta) = 1 - smootherstep(|delta| / w_i)
Rib_i       = R_v(z) + a_i(z) * g_rib(delta)
Valley_i    = R_v(z) - d_i(z) * smootherstep(t_valley)
```

El perfil local se anula con derivadas suaves en la frontera del módulo. Los
valles enlazan el `rib_id` izquierdo con el derecho. El ajuste armónico

```text
r(z,theta) = R(z) + A(z) f_n(theta - Phi(z))
```

queda como descriptor agregado para comparar secciones, no como generador
oculto del cactus.

## Cuerpo y fase

`Phi(z) = Phi_0 + tau*z/H` es continua. `tau` es una hipótesis ajustable y no
una afirmación sobre filotaxis. La expansión media y el relieve se mantienen
separados: `lambda_R` cambia `R_v`, mientras `a_i` controla la costilla.

## Terminación apical

El campo apical comienza en:

```text
z_join = H_body
z_max  = z_join + H_cap
z_meristem = z_max - H_meristem
```

En el hombro, `rho(z)` pasa monótonamente de `R_v` a `rho_meristem` mediante
una Hermite quíntica C². El relieve mantiene las costillas legibles durante el
hombro. Dentro del meristemo, las costillas y valles conservan sus módulos y
se desvanecen C² hacia el polo.

Desde `z_meristem` hasta `z_max` se usa una cúpula meridional deformada de tipo
esférico, con ángulo de apertura explícito y radio axial/radial derivados de
`H_meristem` y `rho_meristem`. La curva se empalma C² con el hombro y termina
en un polo suave. No se añade un disco, una tapa horizontal ni una malla
apical independiente. El polo es una degeneración de coordenadas de muestreo,
no un cono: el criterio es curvatura finita, orientación constante y ausencia
de auto-intersección.

La continuidad en `z_join` se comprueba para varias `theta`:

```text
r_body = r_cap
dr_body/dz = dr_cap/dz
d2r_body/dz2 = d2r_cap/dz2
```

## Areolas y depuración

Las areolas son entidades discretas colocadas sobre la spine de una costilla:

```text
theta_i = Phi(z_i) + 2*pi*rib_id/n + sum(delta_theta)
```

Cada registro conserva `source_id`, `rib_id`, `theta`, `z`, `phase`, normal y
confianza. No se impone el ángulo áureo ni Fibonacci.

La interfaz muestra `z_join`, `z_meristem`, `z_max`, `H_cap/H_body`, el número
de módulos, el perfil meridional y las muestras de `R(z)`, `A_cap(z)` y
curvatura. Los invariantes estructurales son:

- exactamente `n` costillas y `n` valles;
- spines continuas desde el cuerpo hasta el polo terminal;
- cada areola referencia un `rib_id` existente;
- el terminal declara que deriva de módulos;
- topología cerrada, `chi=2`, sin bordes de frontera ni aristas no manifold;
- Jacobiano positivo fuera del polo y orientación constante;
- unión C0/C1/C2 en varias posiciones angulares.

## Medición, hipótesis y decisiones visuales

El SVG sólo aporta una sección de referencia. `R`, `A`, `Phi_0`, `n`, anchos,
relieves, `H_cap`, `rho_meristem`, curvaturas, `tau` y divergencias deben
tratarse como medidos, ajustables o hipotéticos según su procedencia. Una
fotografía no valida profundidad 3D, volumen, mecánica tisular ni una regla
fisiológica de crecimiento.

## Validación y exportación histórica

Los comandos siguientes conservan el experimento SVG reproducible, pero no
regeneran los GLB usados por la ruta web activa. No deben utilizarse para
afirmar que se corrigió el generador Geometry Nodes.

Validar sin Blender:

```text
python integrations/blender/svg_to_cactus_mesh.py --svg apps/web/public/animations/echinopsis-rib-progression.svg --frame 4 --height 2.4 --radius 0.38 --rib-count 8 --apical-ratio 0.23 --apical-segments 24 --angular-segments 96 --meristem-radius-ratio 0.46 --meristem-height-ratio 0.28 --residual-amplitude-ratio 0 --validate-only
```

Exportar a GLB:

```text
blender --background --python integrations/blender/svg_to_cactus_mesh.py -- --svg apps/web/public/animations/echinopsis-rib-progression.svg --frame 4 --height 2.4 --radius 0.38 --rib-count 8 --apical-ratio 0.23 --apical-segments 24 --angular-segments 96 --meristem-radius-ratio 0.46 --meristem-height-ratio 0.28 --residual-amplitude-ratio 0 --out .local/blender-run/echinopsis-pachanoi-modular.glb
```

La salida es una hipótesis geométrica reproducible, no una identificación
taxonómica ni una reconstrucción anatómica de un ejemplar.
