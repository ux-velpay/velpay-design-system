---
tags: [design-system/governance/pipeline]
status: stable
updated: 2026-08-03
---

# Sync Pipeline — Figma → Tokens → Docs

Automatiza la frontera propensa a drift. Un solo sentido: Figma manda, el repo refleja.

```
Figma Variables
      │  (LIBRARY_PUBLISH webhook)
      ▼
extract-figma-tokens.mjs ──► foundations/tokens/*.json
      ▼
Style Dictionary  ──► dist/ (CSS vars, Tailwind, etc.)
      ▼
check-contrast.mjs  ──► falla el build si un par fg/bg no pasa AA
      ▼
generate-docs.mjs  ──► reescribe tablas de design-tokens.md + _generated/*
      ▼
create-pull-request ──► PR con el diff  ──►  revisión humana  ──►  merge
```

## Etapa de extracción — depende de tu plan de Figma

**Opción A — Enterprise (Full seat).** Usa la Variables REST API directo en CI:
`GET /v1/files/:key/variables/local` con header `X-Figma-Token` (scope `file_variables:read`).
Sin plugins. `extract-figma-tokens.mjs` ya trae este camino (modo `rest`).

**Opción B — Plan pago no-Enterprise.** La REST API de variables NO está disponible.
Usa el plugin **Tokens Studio**: define/importa las Variables en Figma y sincroniza el
JSON a este repo (GitHub sync del plugin). El pipeline entonces arranca desde el JSON ya
commiteado (modo `tokens-studio`) y se salta la extracción por API.

En ambos casos, de `foundations/tokens/*.json` en adelante el pipeline es idéntico.

## Disparador (webhook)
Crear un webhook V2 sobre el evento `LIBRARY_PUBLISH` (dispara al publicar la librería;
ya soporta variables). El endpoint recibe el POST y hace `repository_dispatch` al Action.
Alternativa sin server: `workflow_dispatch` manual + `schedule` (nightly).

## Archivos del scaffold
- `pipeline/package.json` — deps (style-dictionary, etc.)
- `pipeline/style-dictionary.config.mjs` — build de tokens → CSS vars
- `pipeline/scripts/extract-figma-tokens.mjs` — Figma → JSON (modos rest / tokens-studio)
- `pipeline/scripts/check-contrast.mjs` — validación WCAG AA de pares fg/bg
- `pipeline/scripts/generate-docs.mjs` — JSON → tablas markdown
- `.github/workflows/figma-sync.yml` — orquesta todo y abre PR

## Qué NO automatiza
- Prose de componentes / patterns / platforms → paso **agéntico** (Claude Code / Dev Mode MCP)
  que redacta borradores al PR. Revisión humana siempre.
- Conflictos de criterio → humano.
