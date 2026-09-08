# Transferencia técnica — FONDART Nacional Investigación 2027, caso WACHUMA

Documento breve para que otro operador o agente retome este paquete sin
depender del historial de conversación que lo produjo. No es un anexo de
la postulación: no corresponde adjuntarlo al FUP.

## Commit publicado

- Repositorio: `github.com/ligereza/WACHUMA` (público)
- Rama: `postulacion/fondart-investigacion-2027`
- Commit: `ebe05470dab9737b53d098cb09de3b1c990d58a5`
- Rama no fusionada a `main` -- el operador decide cuándo/si abrir la PR.
- Esta nota se agregó en un commit posterior (`d31b120`) que no modifica ningún archivo de entrega -- los comandos de comprobación de abajo se ejecutaron contra el contenido de `ebe0547` y siguen siendo válidos en `d31b120`.

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
# -> ebe05470dab9737b53d098cb09de3b1c990d58a5

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
