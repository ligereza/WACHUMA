# Corrida de staging FungalTraits — 2026-08-24

Esta corrida prueba el importador con un snapshot real sin incorporarlo al
repositorio ni publicarlo en el atlas.

| Campo             | Valor                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Proveedor         | `fungaltraits`                                                                                                             |
| Release           | `v0.0.3`                                                                                                                   |
| Snapshot          | [funtothefun.csv del release v0.0.3](https://github.com/traitecoevo/fungaltraits/releases/download/v0.0.3/funtothefun.csv) |
| DOI               | [10.5281/zenodo.1216257](https://doi.org/10.5281/zenodo.1216257)                                                           |
| Tamaño descargado | 6.407.306 bytes                                                                                                            |
| Filas de datos    | 51.555                                                                                                                     |
| Resultado         | 51.555 source records insertados; 0 omitidos                                                                               |
| Estado            | Todos `pending`; `publishable=false`                                                                                       |
| Licencia          | Zenodo: `Other (Open)` sin descripción adicional; licencia del dataset agregado no resuelta                                |

## Decisiones de procedencia

El repositorio fuente declara MIT para el paquete R mediante `DESCRIPTION` y
conserva un archivo `LICENSE` con copyright, pero eso no declara una licencia
de los datos agregados. El registro Zenodo del release exacto dice `Other
(Open)` y no ofrece una descripción adicional. Por eso la decisión automática
queda bloqueada por `license_expression_missing` y no se trata MIT como licencia
del CSV.

El snapshot se descargó a un directorio temporal local, se conservaron release,
DOI, URL, atribución, checksum y fila original en `source_records.raw_payload`,
y no se crearon `trait_measurements` públicos ni claims.

La relación entre una fila y su fuente usa:

```text
v0.0.3:measurement:<obj_id>:row-<rowNumber>
```

Esto evita perder mediciones cuando `obj_id` se repite en distintas filas del
release. Las filas con `value` vacío se mantienen con
`uncertainty.valuePresence = missing`.

## Errores encontrados y convertidos en regresión

1. El primer snapshot real abortó porque había valores vacíos. El parser ahora
   conserva la fila y marca la ausencia explícitamente.
2. La primera clave basada sólo en `obj_id` habría reducido 51.555 filas a
   5.866 registros. La clave ahora incluye `rowNumber`, y el importador prueba
   que dos filas con el mismo `obj_id` permanecen distintas.

El siguiente paso no es publicar traits: requiere resolver la licencia del
release exacto, mapear taxones y definiciones de traits, conservar la fuente de
cada medición y obtener revisión editorial antes de proyectar cualquier dato a
la capa pública. El contrato ahora distingue explícitamente licencia de código
de licencia de datos y enumera el motivo de cada bloqueo.
