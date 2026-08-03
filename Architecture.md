---
tags: [design-system/architecture]
status: stable
updated: 2026-08-03
---

# Design System Architecture

VelPay Design System está compuesto por 5 capas. Cada capa **referencia** la anterior;
nunca la duplica.

## 1. Foundations
Color · Typography · Spacing · Elevation · Motion · Radius.
Se materializan como **tokens** (capa 2). Ver `foundations/`.

## 2. Tokens
- **Primitivos** (`foundations/tokens/color-primitives.json`, `typography-primitives.json`):
  valores crudos, sin semántica.
- **Semánticos** (`color-semantic.json`, `typography-semantic.json`, `layout-tokens.json`):
  referencian primitivos por alias. **Los componentes usan SIEMPRE semánticos, nunca primitivos.**
- Fuente de verdad. Generados desde Figma Variables (ver `governance/sync-pipeline.md`).

## 3. Components
Componentes de UI construidos sobre tokens semánticos. Ver `components/`.
Estado de madurez de cada uno en `components/component-status.md`.

## 4. Patterns
Flujos y composiciones (formularios, filtros, estados de carga). Ver `patterns/`.

## 5. Platforms
Adaptaciones por producto. **Cada plataforma tiene densidad, touch targets e inputs
distintos** — no comparten specs. Ver `platforms/`.

| Plataforma   | Tipo            | Input principal      |
|--------------|-----------------|----------------------|
| Terminal POS | Hardware físico | Touch + teclas       |
| mPOS         | Móvil + lector  | Touch                |
| P5 / D60     | Dispositivo     | Touch (pantalla chica)|
| Web / Backoffice | Escritorio  | Mouse + teclado      |
| Payment Links | Web responsive | Touch / mouse        |
