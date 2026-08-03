---
tags: [design-system/foundations/accessibility]
status: stable
updated: 2026-08-03
---

# Accessibility

Reglas de accesibilidad de primera clase. El drift de color más reciente fue un bug de
contraste, así que esto **no** es opcional.

## Contraste mínimo (WCAG)

| Elemento                         | Ratio | Nivel |
|----------------------------------|-------|-------|
| Texto body                       | 4.5:1 | AA    |
| Texto grande (18px+ bold / 24px+)| 3:1   | AA    |
| Componentes UI (bordes, iconos)  | 3:1   | AA    |
| Texto body (enhanced)            | 7:1   | AAA   |

El pipeline valida esto automáticamente en cada sync (`pipeline/scripts/check-contrast.mjs`).
Un par que no pase **bloquea el merge**.

## Por qué los foreground de status están oscurecidos

Los primitivos `*.fg` de status NO son los colores "de marca" brillantes. Están
oscurecidos a propósito para pasar AA como **texto/icono** sobre su `*.bg` claro:

| Status  | fg (texto)  | bg          | Nota |
|---------|-------------|-------------|------|
| success | `#027A48`   | `#E8FFF4`   | pasa AA |
| error   | `#991F1F`   | `#FFDFDF`   | brillante `#F04438` fallaría |
| warning | `#8A6500`   | `#FFF7E0`   | brillante `#F7B500` fallaría |
| alert   | `#8B3A00`   | `#FBE7CB`   | brillante `#F7732A` fallaría |
| info    | `#2D006D`   | `#F4F3FF`   | pasa AAA |

**Nunca** usar los hex brillantes como texto. Si necesitas el color vivo (ej. un dot de
notificación), es decorativo y va sobre fondo neutro, no como texto.

## Reglas generales
- Nunca comunicar significado solo con color: acompañar con icono, texto o forma.
- Focus visible por teclado (`:focus-visible` + `shadow.focus`).
- Touch targets ≥ 44×44px en cualquier plataforma táctil (POS, mPOS, links).
- `prefers-reduced-motion`: respetar (ver patterns).
