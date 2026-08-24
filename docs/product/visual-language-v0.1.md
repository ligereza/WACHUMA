# WACHUMA · lenguaje visual v0.1

Este documento fija el lenguaje visual mínimo del MVP antes de añadir nuevas
superficies. No intenta resolver la identidad definitiva del proyecto: define
reglas suficientemente estables para que las páginas actuales y las próximas
no inventen una estética o una jerarquía distinta por ruta.

## Idea visual

WACHUMA se presenta como un archivo vivo: una interfaz sobria, editorial y
espacial donde los datos tienen más peso que la ornamentación. La atmósfera
puede ser orgánica, pero nunca debe hacer que una metáfora parezca evidencia.

Reglas:

- La ficha es una lectura continua por capas; el MVP no introduce pestañas
  ocultas para separar información esencial.
- La tipografía de lectura sostiene nombres, descripciones y citas; la
  tipografía de sistema etiqueta estados, navegación, IDs y acciones.
- El espacio en blanco separa capas del conocimiento. Las tarjetas agrupan
  evidencia relacionada, no reemplazan la estructura de procedencia.
- Un dato sensible se comunica con estado y explicación, nunca mediante un
  color aislado o una insinuación visual.
- La representación 3D es una vista editorial o procedural identificada como
  tal; no se usa como prueba taxonómica.

## Tokens

| Categoría          | Token       | Valor actual              | Uso                                          |
| ------------------ | ----------- | ------------------------- | -------------------------------------------- |
| Neutro             | `--ink`     | `#1f2d25`                 | Texto principal y contraste                  |
| Neutro             | `--muted`   | `#68756e`                 | Metadatos, estados vacíos y ayudas           |
| Superficie         | `--paper`   | `#f4f0e7`                 | Fondo de lectura                             |
| Marca              | `--leaf`    | `#496b50`                 | Enlaces, títulos, bordes activos             |
| Marca suave        | `--moss`    | `#bdc9a6`                 | Variación orgánica y superficies secundarias |
| Evidencia/atención | `--sun`     | `#d4935a`                 | Eyebrows, revisión y foco                    |
| Foco               | `--focus`   | `#d4935a`                 | Indicador visible de teclado                 |
| Línea              | `--line`    | `rgba(73, 107, 80, .26)`  | Separadores y bordes suaves                  |
| Superficie         | `--surface` | `rgba(255, 255, 255, .3)` | Tarjetas no interactivas                     |

La paleta no codifica por sí sola los estados editoriales. Cada estado lleva
texto explícito:

| Estado de conocimiento       | Etiqueta visible      | Tratamiento                               |
| ---------------------------- | --------------------- | ----------------------------------------- |
| `public` / publicado         | Público / documentado | Texto normal y fuente visible             |
| `in_review` / `under-review` | En revisión           | Acento `--sun` y explicación del límite   |
| `not_documented`             | Sin documentar        | Estado vacío, sin recomendación inventada |
| `restricted` / `sensitive`   | Restringido           | No aparece en superficies públicas        |
| `community-controlled`       | Control comunitario   | Requiere alcance y revisión explícitos    |

## Tipografía y escala

- Lectura: Georgia, Times New Roman o serif equivalente; nombres científicos
  se escriben en cursiva cuando corresponda.
- Metadatos y controles: `system-ui`, en mayúsculas sólo para etiquetas cortas.
- Títulos: peso regular, contraste por tamaño y espacio, no por negrita masiva.
- Cuerpo: mínimo aproximado de `1rem` con `1.45` de interlineado.
- Etiquetas: entre `0.7rem` y `0.8rem`, siempre acompañadas por contenido
  legible en tarjetas y estados.

## Componentes del MVP

| Componente       | Variantes/estado                                              | Regla de uso                                                                         |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `SiteNav`        | navegación principal, móvil apilada                           | Enlaces por tarea: especies, buscar, jardín, cultivo, cultura, mapa y fuentes        |
| `.button`        | base, `button-primary`, disabled                              | Acciones explícitas; no usar un enlace visual como botón destructivo                 |
| `.tag`           | informativa, activa, estado                                   | Una etiqueta debe tener texto; no usarla como único indicador de permiso             |
| `.detail-card`   | capa de ficha, editor, fuente                                 | Una tarjeta debe tener encabezado o `card-kicker` y no mezclar cultura con taxonomía |
| `.source-row`    | fuente, media, observación                                    | Mostrar atribución, licencia y enlace cuando existan                                 |
| `.guide-section` | `documented`, `in_review`, `not_documented`, `not_applicable` | Explicita la cobertura de cultivo; el estado no sustituye al claim                   |
| `.empty-note`    | sin datos, restringido, no publicado                          | Explica la ausencia sin convertirla en afirmación biológica                          |

## Accesibilidad y comportamiento

- Cada página tiene un `main` y una navegación con `aria-label` cuando es
  principal o específica.
- Todos los enlaces y controles interactivos son alcanzables con Tab y tienen
  un foco visible con contraste suficiente.
- Los formularios conservan `label`, validación textual y estados de error;
  los checkboxes de revisión no dependen sólo del color.
- La cuadrícula se reduce a una o dos columnas en pantallas estrechas; ningún
  dato esencial depende de hover.
- Las imágenes tienen `alt` derivado de su título y cada medio conserva
  licencia/atribución en texto.
- Si se añade movimiento, debe respetar `prefers-reduced-motion`; la escena
  3D debe tener alternativa textual y controles operables.

## Auditoría del CSS actual

El CSS actual ya contiene los tokens de marca, las familias tipográficas, los
componentes principales y breakpoints de `760px`, `720px` y `520px`. El hueco
detectado era la ausencia de un contrato documentado y de un foco global
consistente; ambos quedan fijados en este corte. Persisten valores `rgba`
repetidos en superficies históricas: se consideran deuda de tokenización y no
se deben multiplicar en nuevas páginas.

Antes de crear otro patrón visual, se debe comprobar si encaja en esta tabla o
actualizar este documento y el CSS en la misma entrega. La versión `v0.1` no
define aún logotipo, iconografía, modo oscuro ni identidad visual final.
