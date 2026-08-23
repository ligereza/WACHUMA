# ADR-0005: Estándares de intercambio y workers aislados

Estado: aceptada

## Contexto

Darwin Core, ETS, PPO, PROV-O y RO-Crate aportan interoperabilidad. PlantGL,
L-Py, Helios y Blender aportan generación o simulación 3D, pero sus licencias,
runtime y dependencias no son equivalentes a las del núcleo web.

## Decisión

PostgreSQL/PostGIS sigue siendo la fuente de verdad. WACHUMA implementa
adaptadores de exportación y workers externos:

```text
PostgreSQL/PostGIS
├── API REST/OpenAPI
├── Darwin Core / trait crosswalks
├── JSON-LD / PROV-O / RO-Crate
└── workers de importación y generación 3D
```

Los descriptores de planta son artefactos versionados y legibles por humanos.
Un asset 3D debe conservar parámetros, hash, versión del generador, fuentes y
la etiqueta `procedural-interpretation` cuando corresponda.

## Consecuencias

- No se introduce una base graph-first ni Blender dentro de `apps/web`.
- Un worker puede usar una licencia distinta sólo tras revisión de su frontera
  de distribución y dependencias.
- El sistema obtiene interoperabilidad sin duplicar taxonomía externa.
- Se agrega trabajo de crosswalk y validación, pero se reduce el riesgo de
  reconstruir el modelo cuando llegue Wikibase o un knowledge graph.
