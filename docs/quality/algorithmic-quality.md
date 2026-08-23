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
- El árbol de linaje rechaza ciclos antes de serializarse.

## Ciclo de corrección

Cuando aparece un bug, la corrección debe seguir este orden:

1. Reducirlo a un fixture mínimo reproducible.
2. Nombrar la invariantes que se rompió.
3. Añadir una prueba que falla antes de la corrección.
4. Corregir la capa que posee la regla, no ocultar el síntoma en la UI.
5. Mantener la prueba como regresión permanente.

El gate `pnpm quality:content` valida contenido editorial, claims, relaciones
culturales y hashes 3D. `pnpm quality:migrations` valida que el conjunto de
migraciones y el runner idempotente estén presentes. Ningún gate sustituye una
revisión humana de licencia o conocimiento comunitario.
