---
tags: [design-system/governance]
status: stable
updated: 2026-08-03
---

# Contributing

## Quién puede cambiar qué
- **Tokens (color, spacing, type, etc.):** se cambian en **Figma Variables**. Nadie edita
  los JSON ni el `.md` a mano.
- **Componentes / patterns / platforms:** PR al repo, revisado por el DS owner (UX/UI team).

## Flujo de un cambio de token
1. Diseñador cambia el valor en Figma y **publica la librería**.
2. El webhook dispara el pipeline (ver `sync-pipeline.md`).
3. El pipeline extrae → valida (contraste AA) → regenera JSON + docs → abre **PR**.
4. El owner revisa el **diff** y mergea. El diff es el control de calidad.

## Reglas
- Ningún merge si el check de contraste falla.
- Conflictos que requieren criterio (ej. `shadow.focus`) se resuelven en el PR, a mano.
- Nunca commit directo a `main` de archivos generados.
