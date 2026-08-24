# Claims, calidad y publicación

## Invariantes

1. Todo `Claim` tiene una fuente primaria.
2. Toda afirmación cultural conserva contexto, comunidad o cultura, perspectiva,
   sensibilidad, licencia y estado de revisión.
3. Una observación contemporánea no se convierte automáticamente en una
   recomendación de cultivo.
4. Los claims públicos requieren `visibility=public` y `reviewStatus=accepted`.
5. Los subjects privados, sensibles o controlados por una comunidad no pueden
   filtrarse a través de un claim público.
6. Las mediciones conservan unidad, método, incertidumbre y fuente.
7. Las importaciones conservan payload original, checksum, versión del
   importador y banderas de calidad.
8. Cada `GrowingGuide` declara cobertura para las 15 secciones de cultivo. La
   cobertura no sustituye a un claim: sólo hace explícito si una sección está
   documentada, en revisión, no documentada o no aplica.

## Estados de calidad de importación

`source_record_quality_flags` permite guardar flags compatibles con las
validaciones de proveedores como GBIF sin alterar el payload original:

```text
info | warning | error
```

El error no elimina el registro: impide aceptarlo automáticamente y deja la
decisión editorial registrada.

## Cobertura de manuales

La lista de secciones se mantiene estable en el contrato compartido y en
`schemas/growing-guide.schema.json`:

```text
propagation | substrate | watering | light | temperature | humidity |
nutrition | calendar | pests | diseases | transplant | fruiting |
harvest | observations | bibliography
```

La columna `growing_guides.coverage` conserva la declaración editorial. El API
la proyecta como `sections`, añadiendo cantidad de claims y fuentes públicas.
Una guía puede publicarse con áreas sin documentar si ese límite está
declarado y cada claim existente conserva su fuente.
