# Transferencia técnica — FONDART Nacional Investigación 2027, caso WACHUMA

Documento breve para que otro operador o agente retome este paquete sin
depender del historial de conversación que lo produjo. No es un anexo de
la postulación: no corresponde adjuntarlo al FUP.

## Commit publicado

- Repositorio: `github.com/ligereza/WACHUMA` (público)
- Rama: `postulacion/fondart-investigacion-2027`
- Commit vigente: `888ffa6efebb368c9164552083bc0021eefd5139`
- Rama no fusionada a `main` -- el operador decide cuándo/si abrir la PR.
- Esta nota se agregó originalmente en `d31b120` (documentación, sin tocar
  archivos de entrega). Desde entonces la rama avanzó con `59541cb`
  (aclaración de que ese commit es solo documentación), `60d4df9`/`abb7d05`
  (formato `prettier` sobre los anexos FONDART y `NEXT.md`, gate de release
  verificado completo) y `888ffa6` (ancla la afirmación de
  `procedural-interpretation` en la evidencia de release del propio día,
  agregando dos oraciones a `AVANCE_DE_INVESTIGACION.md` y al dossier
  principal). Ningún commit posterior a `d31b120` tocó identidad ni datos
  personales. Los comandos de comprobación de abajo se re-verificaron contra
  `888ffa6`, no contra `ebe0547`.

## Rutas de entrega (dentro de esta rama)

- Dossier principal: `postulaciones/fondart-investigacion-2027/FONDART_2027_INVESTIGACION_WACHUMA.{json,md}`
- Anexo Avance de Investigación: `postulaciones/fondart-investigacion-2027/ANEXOS/AVANCE_DE_INVESTIGACION.{md,html,pdf}` (15 páginas)
- Anexo Plan de Actividad de Transferencia: `postulaciones/fondart-investigacion-2027/ANEXOS/PLAN_ACTIVIDAD_TRANSFERENCIA.{md,html,pdf}` (5 páginas)
- Ficha de trayectoria del responsable (campos de identidad marcados `[FALTA]`, no rellenados aquí): `postulaciones/fondart-investigacion-2027/ANEXOS/FICHA_TRAYECTORIA_RESPONSABLE.md`
- Matriz de entrega repositorio/portal: `postulaciones/fondart-investigacion-2027/ANEXOS/MATRIZ_LISTOS_PARA_ENVIO.md`
- Backup histórico, **no adjuntar**: `postulaciones/fondart-investigacion-2027/_backups_no_enviar/AVANCE_DE_INVESTIGACION_pre-expansion-13paginas.pdf`

## Comandos de comprobación reproducibles

```sh
# Clonar exactamente este estado
git clone --branch postulacion/fondart-investigacion-2027 --single-branch https://github.com/ligereza/WACHUMA.git
cd WACHUMA/postulaciones/fondart-investigacion-2027

# Confirmar el commit publicado
git log -1 --format=%H
# -> 888ffa6efebb368c9164552083bc0021eefd5139

# Paginación de los dos anexos
pdfinfo ANEXOS/AVANCE_DE_INVESTIGACION.pdf | grep Pages       # -> 15
pdfinfo ANEXOS/PLAN_ACTIVIDAD_TRANSFERENCIA.pdf | grep Pages  # -> 5

# Validez del dossier JSON
python3 -c "import json; json.load(open('FONDART_2027_INVESTIGACION_WACHUMA.json'))"

# Ausencia de patrón de RUT chileno en todo el árbol de la postulación
grep -RnE '[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9kK]' .
# -> sin resultados
```

## Bloqueos que requieren decisión humana

- Identidad, RUT, domicilio y región del responsable -- de la región
  depende si el cierre aplicable es el 14 o el 16 de septiembre de 2026
  (ver `MATRIZ_LISTOS_PARA_ENVIO.md`, filas 1 y 11).
- Contenido real de Perfil Cultura (no solo su existencia).
- CV firmado.
- Cotizaciones reales y revisión laboral/tributaria del presupuesto
  (`MATRIZ_LISTOS_PARA_ENVIO.md`, fila 9).
- Revisión humana de tono de las dos subsecciones redactadas por un agente
  dentro de `AVANCE_DE_INVESTIGACION.md` -- marcadas explícitamente en el
  propio documento como pendientes de aprobación.

## Qué no autoriza este documento

No autoriza enviar la postulación, completar datos personales, ni adjuntar
el backup histórico de `_backups_no_enviar/`. Es una guía de dónde está
todo y cómo comprobarlo, no una ejecución de los pasos pendientes.
