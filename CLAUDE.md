# VelPay Design System

Fuente de verdad oficial del design system de VelPay. **No es una app** — es documentación
(Markdown) + tokens (JSON) + un pipeline de generación (Node). No hay frontend ni servidor que
levantar; no existe `npm run dev`.

Owner: UX/UI Design Team. Productos que soporta: Terminal POS · mPOS · P5 · D60 · Assistant ·
Backoffice · Payment Links.

## Arquitectura — 5 capas (cada una referencia la anterior, nunca la duplica)
1. **Foundations** — Color · Typography · Spacing · Elevation · Motion · Radius. Se materializan
   como tokens.
2. **Tokens** (`Foundations/tokens/*.json`, formato W3C DTCG con `$value`/`$type`):
   - **Primitivos** (`color-primitives.json`, `typography-primitives.json`): valores crudos, sin
     semántica.
   - **Semánticos** (`color-semantic.json`, `typography-semantic.json`, `layout-tokens.json`):
     referencian primitivos por alias.
   - **Regla dura:** los componentes usan SIEMPRE tokens semánticos, NUNCA primitivos.
   - Fuente de verdad. Generados desde Figma Variables (ver pipeline).
3. **Components** (`Components/`) — estado de madurez en `Components/Component Status.md`
   (🟢 stable · 🟡 WIP · 🔴 missing · 🔵 needs-verify). Esa matriz es la **fuente única** de "qué
   existe y qué falta"; no duplicarla en inventory/audit (esos se generan).
4. **Patterns** (`Patterns/`) — flujos y composiciones (formularios, filtros, estados de carga).
5. **Platforms** (`Platforms/`) — adaptaciones por producto. Cada plataforma tiene densidad, touch
   targets e inputs distintos; NO comparten specs. `Platforms/Assistant.md` está en stub/WIP.

## Pipeline de tokens (`pipeline/`)
Un solo sentido: **Figma manda, el repo refleja**.
`Figma Variables → extract → Style Dictionary → gate de contraste AA → genera docs → PR`.

Scripts (correr desde `pipeline/`, con `npm install` primero):
- `npm run build` — tokens JSON → `dist/tokens.css` (Style Dictionary v4). Corre 100% local.
- `npm run check:contrast` — valida WCAG AA de pares fg/bg; **bloquea el build si algo falla**.
- `npm run gen:docs` — regenera tablas de docs desde los JSON.
- `npm run extract` — baja tokens de Figma. Requiere `FIGMA_TOKEN` + `FIGMA_FILE_KEY`
  (Figma Enterprise / Variables REST API). NO corre sin esas credenciales.
- `npm run sync` — los 4 en orden.

CI: `.github/workflows/figma-sync.yml` corre nightly (cron 6am) + webhook `LIBRARY_PUBLISH`, y usa
`claude-code-action` para redactar prose en el PR. Node 20 en CI.

## Convenciones al trabajar aquí
- **No editar archivos generados** (`_generated/*`, `pipeline/dist/*`) a mano ni cambiar valores de
  token en prose — los tokens se cambian en Figma y bajan por el pipeline.
- Archivos generados y matriz de estado son fuente única: no repetir esa info en otros docs.
- Contraste AA es un gate obligatorio: cualquier cambio de color de texto debe pasar
  `check:contrast`.
- Docs `.md` llevan frontmatter con `tags`, `status`, `updated`.

## Bug conocido (sin arreglar)
`pipeline/style-dictionary.config.mjs` apunta a `../foundations/tokens/*.json` (minúscula) pero la
carpeta real es `Foundations/` (mayúscula). Funciona en macOS (filesystem case-insensitive) pero
**fallaría en Linux/CI**. Verificar antes de confiar en el build en CI.

## Pendientes abiertos (ver `Changelog.md` → Unreleased)
- `shadow.focus`: conflicto púrpura (docs) vs negro (Figma), sin resolver.
- Gaps de componentes por ubicar en Figma: Navigation (top/sidebar), Alert Banner,
  Loading (skeleton/spinner).
- `Platforms/Assistant.md`: stub — faltan touch targets, densidad y escala tipográfica.
