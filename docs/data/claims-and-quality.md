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

## Estados de calidad de importación

`source_record_quality_flags` permite guardar flags compatibles con las
validaciones de proveedores como GBIF sin alterar el payload original:

```text
info | warning | error
```

El error no elimina el registro: impide aceptarlo automáticamente y deja la
decisión editorial registrada.
