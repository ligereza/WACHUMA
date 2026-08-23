# `@wachuma/db`

Fuente de verdad relacional: PostgreSQL + PostGIS, schema Drizzle y
migraciones SQL revisables. `migrations/0001_initial.sql` crea las entidades
del ERD, checks de procedencia/sensibilidad y los índices espaciales/textuales
iniciales.

`createImportRepository` persiste snapshots de `source_records` dentro de una
transacción. La clave incluye proveedor, registro y timestamp de recuperación:
repetir el mismo job es idempotente y una nueva recuperación conserva el
snapshot anterior.

El proyector GBIF conserva primero `source_records` y después materializa, de
forma idempotente, el taxón, observaciones externas con coordenadas públicas
redondeadas, medios con licencia individual y filas `record_provenance`. Los
registros no publicables permanecen restringidos.
