---
tags: [design-system/foundations/moc]
status: stable
updated: 2026-08-03
---


# Foundations

> [!info] Fuente de verdad
> Los valores viven en `tokens/*.json` (generados desde Figma). `[[Design Tokens]]` es la
> referencia humana, también generada. No teclear hex a mano.

- [[Design Tokens]] — color, spacing, type, shadow, radius, motion (generado)
- [[Accessibility]] — contraste WCAG, por qué los status fg están oscurecidos
- `tokens/` — `color-primitives.json`, `color-semantic.json`, `layout-tokens.json`,
  `typography-primitives.json`, `typography-semantic.json`

## Capas de token
`primitivos` (valor crudo) → `semánticos` (alias, los que usan los componentes).
Nunca referenciar primitivos directamente en componentes.
