---
tags: [design-system/moc]
status: stable
updated: 2026-08-03
aliases: [VDS, Home]
---


# VelPay Design System

Nota de inicio (MOC). Punto de entrada del vault.

> [!abstract] Cadena de autoridad — fuente de verdad
> Si dos notas se contradicen, gana la de más arriba.
> `Figma Variables` → `Foundations/tokens/*.json` (generado) → `[[Design Tokens]]` (generado) → todo lo demás.
> Los `.json` y las tablas de `[[Design Tokens]]` **no se editan a mano**: se generan. Ver `[[Sync Pipeline]]`.

> [!important] Regla anti-drift
> Todo cambio de token entra por un **PR con diff** generado por el pipeline, nunca por
> edición manual. El diff es el control de calidad.

## Mapa

**Base**
- [[Overview]] — qué es y qué productos cubre
- [[Architecture]] — las 5 capas
- [[History]] · [[Changelog]]

**Contenido**
- [[Foundations]] — tokens, [[Design Tokens]], [[Accessibility]]
- [[Components]] — [[Component Library]], [[Component Status]]
- [[Patterns]] — [[Polish and Craft]]
- [[Platforms]] — specs por producto (POS, mPOS, web…)

**Proceso**
- [[Governance]] — [[Contributing]], [[Sync Pipeline]]
- [[Inventory]] · [[Audit]] (snapshots generados)

## Conflictos abiertos
> [!warning] Pendientes de decisión humana
> - **`shadow.focus`**: púrpura (docs) vs negro (Figma). Sin resolver.
> - **Easing**: `[[Design Tokens]]` y `[[Polish and Craft]]` definen curvas distintas.
