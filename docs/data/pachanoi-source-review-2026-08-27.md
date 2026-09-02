# Cola editorial de fuentes sobre Echinopsis pachanoi

Fecha de revisión: 2026-08-27. Esta cola se deriva de
`.local/source-harvest/pachanoi-pages-2026-08-27.json`, producido por
`scripts/harvest-pachanoi-pages.mjs`.

## Regla de decisión

La cosecha fue allowlist-only, consultó `robots.txt` y guardó únicamente
metadatos, estado HTTP y hashes. No conserva cuerpos HTML, PDFs, tablas,
figuras ni imágenes. Por tanto, este lote demuestra que una URL fue localizada
y que algunos metadatos estuvieron disponibles; no demuestra por sí solo el
contenido científico de una afirmación.

Una fuente sólo puede aportar un claim público cuando una persona revisa la
fuente original, delimita el alcance de la afirmación, registra su
`sourceRecordId`, conserva atribución y licencia, y establece el estado de
revisión correspondiente. Una licencia abierta permite usos distintos según
la licencia; no autoriza a presentar una interpretación editorial como hecho
universal.

## Estado del lote

| Resultado              | Cantidad | Consecuencia                                                       |
| ---------------------- | -------: | ------------------------------------------------------------------ |
| `fetched-metadata`     |        9 | Puede conservarse como referencia y candidato editorial            |
| `access-challenge`     |        1 | No se extrae contenido; queda sólo el enlace y el estado observado |
| Publicación automática |        0 | Todas las entradas importadas permanecen `pending-source-review`   |

## Decisiones por fuente

| Fuente                                                                  | `sourceRecordId`                                                                             | Observado                                                                   | Uso permitido ahora                                               | Bloqueo para publicar claims                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| UTN, modelación de hábitat (Ecuador, 2017)                              | `utn-handle:123456789/7458`                                                                  | Metadatos HTTP 200; licencia declarada CC BY-NC-ND 4.0 en la política local | Cita, enlace, atribución y candidato para distribución potencial  | Verificar tesis y alcance exacto de sus resultados; no redistribuir tesis ni figuras                                 |
| Armijos, Cota y González, yachakkuna Saraguro (2014)                    | `publication:10.1186/1746-4269-10-26`                                                        | Desafío de acceso; no se obtuvo metadata de la página                       | Enlace, registro de procedencia y estado de acceso                | Revisión de la publicación y contexto comunitario; no afirmar contenido a partir del título                          |
| LILA, Echinopsis pachanoi                                               | `url:visionary.art/pharmakon/plants/echinopsis-pachanoi`                                     | Metadatos HTTP 200; licencia de texto no identificada                       | Enlace y referencia; no copiar texto ni imágenes                  | Licencia, autoría individual de imágenes y revisión del contenido                                                    |
| Jardín Botánico ISTMAS, Cactus San Pedro                                | `url:herbario.istmas.edu.ec/cactaceae/cactus-san-pedro`                                      | Metadatos HTTP 200; licencia de contenido no identificada                   | Enlace y referencia institucional                                 | Permiso/licencia y revisión de la ficha                                                                              |
| Cactus y Suculentas, Echinopsis pachanoi                                | `url:cactusysuculentas.org/cactus/echinopsis-pachanoi-historia-y-curiosidades-del-san-pedro` | Metadatos HTTP 200; licencia de contenido no identificada                   | Enlace y referencia; metadata-only                                | Licencia y revisión manual de claims                                                                                 |
| Arid Agriculture, Trichocereus pachanoi                                 | `url:aridagriculture.org/crop/trichocereus-pachanoi`                                         | Metadatos HTTP 200; política local fair-use/no republicación                | Enlace y referencia; no copiar contenido                          | No republicar texto, imágenes ni datos derivados sin permiso                                                         |
| UNPRG, rizosfera en Lambayeque (2023)                                   | `unprg-handle:20.500.12893/11487`                                                            | Metadatos HTTP 200; página declara CC BY-SA 4.0                             | Cita, enlace, atribución y candidato para claim situado           | Revisar tesis y conservar la obligación share-alike de cualquier adaptación                                          |
| Universidad Nacional de Tumbes, genómica/proteómica/metabolómica (2020) | `untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9`                                         | Metadatos HTTP 200; página declara CC BY 4.0                                | Cita, enlace, atribución y candidato para claim analítico situado | Verificar especies, muestras y límites; no convertir resultados en composición universal ni recomendación de consumo |
| SciELO / Terra Latinoamericana, rizosfera (2025)                        | `scielo-pid:S0187-57792025000100601`                                                         | Metadatos HTTP 200; página declara CC BY-NC-ND 4.0                          | Cita, enlace, atribución y paráfrasis editorial revisada          | No redistribuir texto, tablas o figuras; verificar alcance microbiológico                                            |
| San Pedro Source, The Source Blog                                       | `url:sanpedrosource.com/blogs/the-source-blog`                                               | Metadatos HTTP 200; licencia del texto no identificada                      | Enlace y referencia metadata-only                                 | No copiar artículos ni imágenes; revisar licencia antes de cualquier reutilización                                   |

## Claims que siguen bajo revisión

Los candidatos sobre distribución potencial, rizosfera y perfiles analíticos
continúan `under-review`. El recolector no es evidencia suficiente para
aceptarlos: la evidencia debe revisarse en la publicación original y quedar
acotada a sus muestras, región, método y fecha.

Los nombres `wachuma`, `huachuma`, `San Pedro` y expresiones equivalentes no
se resuelven desde el título de una página ni como sinónimos taxonómicos
automáticos. Una relación cultural necesita contexto, comunidad o perspectiva
documentada, territorio, fecha, fuente, licencia/restricción y revisión
comunitaria cuando corresponda.

## Siguiente acción editorial mínima

1. Revisar individualmente los documentos científicos y la publicación
   cultural accesible por una copia o página autorizada.
2. Registrar para cada claim el pasaje o tabla consultada en un registro de
   procedencia interno, sin copiar material protegido al corpus público.
3. Mantener como `metadata-only` las páginas editoriales sin licencia clara.
4. No aceptar relaciones culturales sensibles desde esta cosecha sin la
   revisión de contexto y comunidad prevista por la política de WACHUMA.

Hasta completar esas acciones, la cola es trazabilidad y no una autorización
de republicación.
