# Verificación de release — 2026-09-08

Esta nota registra el primer `pnpm verify:release` local, completo y verde,
ejecutado sobre la punta real del trabajo pendiente de fusión a `main`, y el
defecto que impedía que lo estuviera.

## Punto de partida: qué rama es la punta real

`origin/main` está en `beafd8f` (PR #9). El commit `14ca942` ("feat: make the
content schemas binding", rama `fix/enforce-content-schemas`) **no está
fusionado a `main`** y no aparece en ninguna corrida de CI conocida contra
`main`. `origin/postulacion/fondart-investigacion-2027` (`c29de5a`) contiene
ese commit más `62e58e5` (NEXT.md) y el propio `c29de5a` (anexos FONDART): es
la punta real del repositorio, no `main`.

Una primera corrida de `verify:release` contra `origin/main` (`beafd8f`) pasó
limpia — pero no ejercitaba el binding de schemas todavía sin fusionar, así
que no dice nada sobre si esa rama pendiente está lista.

## Defecto encontrado y reparado

Corriendo `verify:release` completo (con `DATABASE_URL` exportado en el mismo
proceso — sin eso, el gate `quality:retired-scope` falla con "DATABASE_URL is
required" antes de llegar a ningún gate geométrico o de contenido) contra
`c29de5a`, el gate `format:check` (`prettier --check .`) falló sobre 7
archivos: `NEXT.md` y los 6 archivos de
`postulaciones/fondart-investigacion-2027/ANEXOS/` + el dossier principal,
todos añadidos en `c29de5a` sin pasar por Prettier antes del commit. Esto
bloqueaba el release real de la rama, no un detalle cosmético menor: un CI que
corra los mismos gates habría fallado en el mismo punto, antes de llegar a
`db:verify` o a los smoke tests públicos.

Se corrigió con `prettier --write` sobre esos 7 archivos. Diff verificado
manualmente: en los `.md`, son cambios de alineación de tablas y de estilo de
énfasis (`*texto*` → `_texto_`, mismo render), sin cambio de contenido. En los
dos `.html` (anexos generados, sin `<pre>`/`<code>` sensibles a espacios en
blanco), Prettier pasó de HTML minificado a HTML indentado — más líneas de
diff, pero el árbol de nodos y el render en navegador no cambian.

## Resultado: los 30 gates pasan limpio sobre `c29de5a` (con el fix aplicado)

```
typecheck, lint, test, build, quality:taxonomy-fixture, quality:content,
quality:pachanoi-knowledge, quality:content-manifest, quality:licenses,
quality:sbom, quality:release-policy, quality:migrations,
quality:retired-scope, quality:procedural, quality:procgen-glb,
quality:source-map, validate:glb, quality:topology, format:check,
db:verify, quality:public-export, quality:source-review,
quality:gbif-pachanoi, quality:legacy-db, quality:markdown, quality:corpus,
quality:content-db, quality:public-corpus, verify:public-web
→ all automated gates passed
```

`quality:topology` (el test geométrico real: manifold del cuerpo, cero
aristas de borde, cero aristas no-manifold, cero conflictos de orientación,
cero triángulos degenerados, hash de contenido e identidad de aréolas
consistente en 10 frames) pasó sin fallos. El propio script declara qué no
mide: autointersecciones, continuidad de costillas, continuidad C0/C1/C2,
Jacobiano, aplicación única de shader — eso sigue sin verificarse y no se le
atribuye una cobertura que no tiene.

`quality:release-policy` reporta `"releaseStatus":
"not-ready-for-broad-public-release"` — es una declaración de política
(revisión legal y comunitaria pendientes), no una falla de gate; el script
la imprime y continúa.

## Lo que esto NO resuelve

- El commit `14ca942` sigue sin fusionarse a `main`. Este documento confirma
  que la rama que lo contiene pasa el release gate completo hoy; fusionar
  o no a `main`, y cuándo, sigue siendo una decisión humana (afecta un
  repositorio con remoto real).
- No se ejecutó ningún CI remoto para esta verificación — es evidencia local,
  igual que otras entradas de este mismo archivo de calidad lo declaran para
  corridas anteriores.
- No se corrigió nada más allá del formato: ningún otro gate estaba en rojo.
