# Decisiones derivadas del research complementario

El informe complementario compartido para Biocultural Garden se usa como
material de diseño, no como licencia para copiar código o importar datasets.
Estas son las decisiones que sí pasan al modelo de WACHUMA:

La ronda de research del 23 de agosto de 2026 añadió estándares de biodiversidad
(Darwin Core, ETS, PPO), procedencia (PROV-O y RO-Crate), gobernanza biocultural
(CARE y Local Contexts), y modelado de materiales derivativos (DINA). La
implementación correspondiente está documentada en
[`ADR-0003-evidence-claims.md`](./ADR-0003-evidence-claims.md),
[`ADR-0004-material-derivation.md`](./ADR-0004-material-derivation.md) y
[`ADR-0005-standards-and-workers.md`](./ADR-0005-standards-and-workers.md).

## Registrar no es recomendar

La filosofía observada en herramientas de seguimiento de plantas se formaliza
con dos capas separadas:

- `Observation` y `CultivationEvent` describen algo que ocurrió, quién lo
  registró y cuándo.
- `GrowingGuideClaim` describe una afirmación o recomendación condicionada,
  versionada y con fuente/evidencia.

La interfaz debe etiquetar ambas capas y nunca convertir un riego observado en
una regla universal de cultivo.

## Identidad genética, material y taxonomía

`Taxon` y `BiologicalEntity` describen conceptos biológicos; `Specimen` y
`Culture` describen material concreto. Una semilla, un clon, un esqueje, un
aislado o una cultura de agar pueden tener genealogía sin convertirse por eso
en una especie nueva. Las relaciones de linaje conservan tipo, generación,
fuente y estado de revisión.

## Incertidumbre explícita

`evidenceLevel`, `assertionType`, `reviewStatus`, perspectiva y procedencia son
datos de dominio. Una ausencia de revisión no se rellena con una inferencia de
la interfaz. El caso _Echinopsis pachanoi_ conserva `Trichocereus pachanoi`
como combinación histórica en borrador y mantiene `wachuma`, `huachuma` y
`San Pedro` como relaciones culturales contextualizadas.

## Colecciones, herbarios y futuro offline

La arquitectura permite añadir observaciones de herbario y captura móvil sin
alterar el núcleo: ambos serían `Observation`/`Media` con `SourceRecord` y
licencia individual. Offline-first, PWA y sincronización conflict-aware quedan
fuera del MVP, pero los IDs públicos, timestamps y snapshots idempotentes dejan
una frontera clara para incorporarlos.

## IA y computer vision

Los datasets de identificación vegetal, cactus o imágenes de herbarios no se
importan durante el MVP. Si llegan a una fase posterior, producirán hipótesis
de observación con confianza y fuente; nunca modificarán automáticamente el
taxón aceptado ni expondrán localidades sensibles.

## Evidencia computable y rasgos

`Claim` es la capa universal para conectar una afirmación con una fuente,
perspectiva, fecha, revisión y visibilidad. `TraitMeasurement` y los protocolos
permiten conservar rasgos ecológicos, mediciones del jardín y fenología sin
confundirlos con la identidad taxonómica. Las tablas nuevas están en la
migración `0006_evidence_materials_traits_protocols.sql`.

## Organismo como estudio material

La nueva capa `MaterialFixture` se apoya en tres líneas de research que deben
permanecer separadas:

- **Arquitectura y crecimiento:** L-Py/OpenAlea modelan sistemas-L, estructuras
  multiescala y desarrollo de arquitectura vegetal. Se usarán como referencia o
  workers externos, no como dependencia del navegador; sus licencias CeCILL y
  CeCILL-C requieren conservar la frontera de distribución.
- **Óptica y materialidad:** PROSPECT y los modelos de transferencia radiativa
  relacionan reflectancia/transmitancia con estructura mesofílica, pigmentos y
  agua. WACHUMA puede representar esas variables solo cuando existen mediciones
  o claims trazados; un color PBR o un brillo artístico nunca sustituye una
  reflectancia espectral.
- **Química visualizable:** RDKit y 3Dmol.js son candidatos BSD para normalizar
  estructuras y mostrar moléculas pequeñas; Mol* es una alternativa futura para
  estructuras biomoleculares mayores. Ninguno debe convertir la presencia de un
  compuesto en una afirmación de efecto, toxicidad o potencia.

La decisión resultante es mantener el núcleo web en Three.js/React Three Fiber,
producir geometría mediante recetas versionadas y cargar la vista molecular como
una superficie opcional. Las relaciones entre organismo, cultivo, traits,
ensayos y química se guardan como claims/mediciones con fuente, método, unidad,
fecha e incertidumbre. La investigación y las licencias se vuelven parte del
contrato de implementación, no solo bibliografía externa.
