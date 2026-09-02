# Cosecha de fuentes sobre Echinopsis pachanoi · 2026-08-27

## Alcance

El lote se ejecutó con `node scripts/harvest-pachanoi-pages.mjs`. Es una allowlist de páginas elegidas explícitamente, no un crawler. El recolector consulta `robots.txt`, aplica el `Crawl-delay` declarado, guarda metadatos y huellas SHA-256, pero no guarda cuerpos HTML, resúmenes, PDFs ni imágenes.

Salida temporal reproducible del lote:

`C:\IA\wachuma\.local\source-harvest\pachanoi-pages-2026-08-27.json`

- Versión: `pachanoi-page-harvester-v0.2.1`
- Resultado: 10 fuentes; 9 con metadatos; 1 con desafío de acceso
- Los `sourceRecordId` son identificadores estables del proveedor, separados del `sourcePublicId` de la política local.
- Publicación automática: desactivada
- Descarga de imágenes: desactivada

## Fuentes seleccionadas

| Fuente                                                                   | Procedencia                               | Licencia/estado                                 | Uso en WACHUMA                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| UTN · modelación de hábitat (Ecuador, 2017)                              | Repositorio institucional                 | CC BY-NC-ND 4.0                                 | Metadatos y claim de distribución potencial, bajo revisión     |
| Armijos, Cota y González · yachakkuna Saraguro (2014)                    | Journal of Ethnobiology and Ethnomedicine | CC BY 2.0; la página presentó desafío de acceso | Enlace y registro; no se cosechó cuerpo                        |
| LILA · Echinopsis pachanoi                                               | Página editorial especializada            | Licencia del texto pendiente                    | Sólo metadatos; no republicar texto/imágenes                   |
| Jardín Botánico ISTMAS · Cactus San Pedro                                | Jardín botánico ecuatoriano               | Licencia pendiente                              | Sólo metadatos                                                 |
| Cactus y Suculentas · Echinopsis pachanoi                                | Página especializada en español           | Licencia pendiente                              | Sólo metadatos                                                 |
| Arid Agriculture · Trichocereus pachanoi                                 | Ficha editorial                           | Fair use; no republicación                      | Sólo metadatos y enlace                                        |
| UNPRG · rizosfera en Lambayeque (2023)                                   | Repositorio institucional peruano         | CC BY-SA 4.0                                    | Fuente y claim de microbiología, bajo revisión                 |
| Universidad Nacional de Tumbes · genómica/proteómica/metabolómica (2020) | Repositorio institucional peruano         | CC BY 4.0                                       | Fuente y claim analítico, bajo revisión                        |
| SciELO/Terra Latinoamericana · rizosfera (2025)                          | Revista científica latinoamericana        | CC BY-NC-ND 4.0                                 | Fuente y claim de microbiología, bajo revisión                 |
| San Pedro Source · The Source Blog                                       | Blog especializado                        | Licencia del texto pendiente                    | Sólo metadatos; lectura pública permitida por robots/agents.md |

## Regla editorial

Una licencia abierta no convierte automáticamente una página en una guía de cultivo ni autoriza a presentar una interpretación como hecho biológico universal. Los nuevos claims distinguen el estudio, su objeto y su alcance: la tesis de rizosfera no prueba una necesidad de cultivo; la tesis metabolómica no define una composición universal ni una recomendación de consumo; y el artículo de SciELO se conserva como investigación de microbiología vegetal.

El JSON de cosecha queda en `.local/` como evidencia de ejecución local y no se incorpora al corpus público. El corpus versionado conserva únicamente fuentes, enlaces, atribución y paráfrasis editoriales con `sourceRecordId`, `recordedOn` y `reviewStatus`.

Para persistir los `sourceRecord` en PostgreSQL, después de levantar la base se ejecuta `pnpm import:pachanoi:page-harvest`. El comando exige `DATABASE_URL`, usa el JSON más reciente, conserva el estado `pending-source-review` y vuelve a rechazar cualquier payload que contenga cuerpo HTML.
