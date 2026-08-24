# Calidad algorítmica y errores como sustrato

WACHUMA trata cada fallo encontrado durante el desarrollo como una entrada
para mejorar el sistema, no como una corrección aislada.

```text
entrada externa o editorial
        ↓
contrato JSON/Zod + procedencia
        ↓
regla de dominio (linaje, publicación, licencia, privacidad)
        ↓
persistencia transaccional e idempotente
        ↓
DTO público filtrado
        ↓
prueba de regresión + fixture dorado
        ↓
gate de contenido, formato y build
```

## Invariantes actuales

- Un `publicId` solo entra por rutas URL-safe y los errores tienen un envelope
  estable con `requestId`.
- Una afirmación cultural o técnica necesita fuente, perspectiva/licencia y
  estado de revisión antes de ser publicable.
- `geometry_exact` nunca forma parte de un DTO público; el mapa usa
  `geometry_public` redondeada.
- Un ejemplar privado puede existir en la escena o la base y aun así no
  aparecer en colección, ficha pública ni linaje público.
- Un asset procedural conserva algoritmo, versión, semilla, hash, licencia y
  la declaración de que no es una afirmación taxonómica.
- Los imports externos conservan payload bruto, checksum, timestamp,
  atribución y estado `pending`; repetir el mismo snapshot no crea otra fila.
- Las proyecciones externas conservan también el `source_id` directo en su
  procedencia; la lectura puede resolver la fuente por esa relación y mantiene
  un fallback para registros históricos importados antes de ese vínculo.
- El árbol de linaje rechaza ciclos antes de serializarse.

## Ciclo de corrección

Cuando aparece un bug, la corrección debe seguir este orden:

1. Reducirlo a un fixture mínimo reproducible.
2. Nombrar la invariantes que se rompió.
3. Añadir una prueba que falla antes de la corrección.
4. Corregir la capa que posee la regla, no ocultar el síntoma en la UI.
5. Mantener la prueba como regresión permanente.

El gate `pnpm quality:content` valida contenido editorial, claims, relaciones
culturales y hashes 3D. `pnpm quality:content-db` compara ese contenido
versionado con las filas persistidas: especies, identificadores externos,
manuales, claims, relaciones culturales, estados de publicación y fuentes.
`pnpm content:manifest` descubre los documentos sin listas manuales y
`pnpm quality:content-manifest` conserva una regresión que prueba la
incorporación de un documento nuevo. El seed usa esos documentos para metadatos,
cobertura y claims de manuales; sus UUID deterministas requieren un mapeo
explícito y hacen fallar el seed si el corpus crece sin una decisión persistente.
`pnpm quality:migrations` valida que el conjunto de migraciones y el runner
idempotente estén presentes. Ningún gate sustituye una revisión humana de
licencia o conocimiento comunitario.

`pnpm db:verify` vuelve a ejecutar el seed editorial después de los tests de
integración. Las pruebas pueden mutar deliberadamente una fuente o relación
para probar revisión y takedown, pero esas mutaciones no contaminan los gates
posteriores ni el estado local reproducible.

La auditoría de contenido es direccional por diseño: valida que cada especie,
manual, claim, relación y fuente declarados en los manifiestos exista en la
base. No exige que toda proyección externa importada aparezca también en un
JSON editorial, porque el staging y la revisión por registro pueden producir
filas adicionales.

El gate `pnpm quality:corpus` consulta PostgreSQL/PostGIS después de migrar y
sembrar. Comprueba que las aceptaciones tengan una decisión editorial aceptada
y metadatos de derechos, que las entidades públicas y los imports externos
tengan procedencia aceptada, que claims y manuales publiquen fuentes, y que
las relaciones culturales públicas no expongan contexto restringido. También
emite conteos del estado del corpus para que una corrida sea auditable, no sólo
binaria.
