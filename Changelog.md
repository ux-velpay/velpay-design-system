---
tags: [design-system/changelog]
status: stable
updated: 2026-08-03
---

# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com). El pipeline agrega entradas
automáticamente en cada sync de tokens.

## [Unreleased]

### Fixed
- `status.error/warning/alert` foreground corregidos a los valores oscurecidos de Figma
  (`#991F1F` / `#8A6500` / `#8B3A00`) — pasaban a fallar contraste AA. (2026-08-03)
- `border.error` → `#991F1F`.

### Changed
- Primitivos de status renombrados `*-50/*-100` → `*.fg` / `*.bg`.

### Added
- Estilos tipográficos semánticos (h1–h4, body.*, component.*).
- Componentes documentados: Checkbox, Radio, Toggle, Select/Multiselect/Combo, Chips/Filters, Filter Panel.

### Pending
- `shadow.focus`: conflicto púrpura (docs) vs negro (Figma). Sin resolver.
