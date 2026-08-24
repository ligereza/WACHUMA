# ADR-0006: Organismos como estudios materiales interactivos

**Estado:** Accepted · first persistence implemented
**Fecha:** 2026-08-24
**Decisores:** mantenedores de WACHUMA

## Contexto

La ficha de una especie no debe reducirse a texto, fotografía y un visor 3D
decorativo. WACHUMA necesita que cada organismo pueda aparecer como un objeto
material interactivo: una luminaria/estudio de materia cuya forma, superficie,
estado de cultivo y relaciones químicas se puedan explorar juntas.

La conexión visual no puede convertir una interpretación artística en prueba
taxonómica, horticultural o química. En particular, la presencia de una
molécula no implica por sí sola un color, brillo, toxicidad, potencia o efecto
visible.

## Decisión

Introducir el concepto portable `MaterialFixture` (fixture material del
organismo). No es un nuevo taxón ni un ejemplar: es una representación
versionada que puede apuntar a un `BiologicalEntity`, a un `Specimen` real o a
ambos.

El contrato vive en
`schemas/material-fixture.schema.json` y sus tipos en
`packages/shared/src/material-fixture.ts`.

```text
BiologicalEntity / Specimen
          │
          ▼
     MaterialFixture
       ├── SceneAsset / ProceduralRecipe
       ├── morphology bindings ── Claims / Sources
       ├── cultivation bindings ─ Claims / GrowingGuide / Events
       └── chemistry bindings ─── Claims / Traits / Assays / Sources
```

## Reglas semánticas

1. `representationType` distingue `material-study`, `specimen-capture` y
   `procedural-interpretation`.
2. Cada binding declara una capa (`morphology`, `cultivation`, `chemistry` o
   `ecology`), un destino visual y el tipo de interpretación: `observed`,
   `measured`, `derived` o `symbolic`.
3. Un binding químico exige `claimIds` y `sourceIds`. La interfaz debe mostrar
   la afirmación y su fuente antes de aplicar la traducción visual.
4. El material PBR describe una representación; no es una medición química.
   `emissiveStrength` es cero por defecto. Un brillo no puede sugerir actividad
   química, bioluminiscencia o potencia si no existe evidencia específica.
5. La geometría puede derivarse de morfología documentada y la animación de
   eventos/etapas de cultivo, pero ambas se etiquetan como derivación cuando no
   son una captura o medición del ejemplar.
6. Las fuentes y claims conservan la separación entre taxonomía, observación,
   cultivo, química, cultura e interpretación editorial.

## Experiencia prevista

La ficha pública evolucionará hacia un estudio en tres lecturas simultáneas:

- **Forma:** rotación, escala y partes del organismo; cada llamada visual abre
  morfología y procedencia.
- **Cultivo:** una línea temporal de etapa, sustrato, riego, luz y eventos; el
  usuario puede comparar estados sin confundir un ejemplar real con uno
  procedural.
- **Materia:** rugosidad, translucencia, color y variación; cada cambio muestra
  si es observado, medido, derivado o simbólico y qué fuente lo permite.

La iluminación será una herramienta de lectura, no una afirmación: el usuario
puede cambiar la luz de la escena, mientras las propiedades documentadas se
mantienen separadas del control artístico.

## Persistencia y evolución

La primera persistencia usa `material_fixtures`,
`material_fixture_bindings` y tablas de enlace a claims y fuentes. Los assets y
recetas 3D siguen siendo referencias opcionales: una ficha material puede
publicarse como estudio PBR aunque todavía no exista un asset 3D publicable.
El repository filtra por visibilidad del organismo y del ejemplar, resuelve
IDs públicos de claims/fuentes y mantiene el contrato JSON independiente de la
forma relacional.

No se añade todavía una tabla química genérica: los hechos químicos deben entrar
por `Claim`/traits/assays con su fuente y unidad. Una futura entidad química
solo se incorporará cuando exista un caso real que requiera normalizar
compuestos, métodos de ensayo y concentraciones.

## Criterios de aceptación

- Un fixture puede apuntar a una entidad biológica o espécimen.
- Un binding químico sin claim y fuente falla antes de persistir.
- El contrato conserva `scientificReconstruction: false` para interpretaciones
  procedurales.
- La web puede mostrar forma, cultivo y materia como capas separadas.
- Ningún parámetro visual se presenta como propiedad química sin evidencia
  explícita.
