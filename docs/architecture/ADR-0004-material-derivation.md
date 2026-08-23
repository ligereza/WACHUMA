# ADR-0004: Eventos de derivación para material biológico

Estado: aceptada

## Contexto

Una relación estática no describe adecuadamente una cadena de propagación,
aislamiento o cultivo. Una planta puede producir un esqueje, una semilla puede
originar un ejemplar y un hongo puede transformarse en una cultura o spawn.

## Decisión

Mantener `LineageRelationship` para la lectura de árboles y agregar:

```text
DerivationEvent
└── DerivationEventMaterial[input|output]
```

El evento conserva método, fecha, operador, ubicación, fuente, notas y
visibilidad. Cada material puede referenciar un `BiologicalEntity`, `Specimen`
o `Culture`, con una etiqueta para materiales todavía no reconciliados.

## Consecuencias

- Plantas, hongos, semillas, clones, aislados y spawn comparten el mismo patrón.
- La trazabilidad puede convertirse en una red dirigida sin duplicar tablas.
- Los eventos privados permanecen fuera de las rutas públicas.
- Se debe validar que un evento tenga al menos un material de entrada y otro de
  salida antes de aceptarlo como derivación completa.
