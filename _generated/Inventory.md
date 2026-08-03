---
tags: [design-system/generated]
status: generated
updated: 2026-08-03
---

> [!note] Snapshot generado (2026-08-03)
> Salida de CI. Se regenera en cada corrida del pipeline. No editar a mano.

# Inventario del Design System — Reconciliado contra Figma

> **Fuente de verdad:** Figma `Design Tokens ✨` (fileKey `qMPFDSFD1AWgESKaCtvMcm`,
> modificado 2026‑08‑03), leído vía Dev Mode MCP.
> Nodos analizados: **Foundations** `30:1750` y **Ui Guidelines** `120:157`.
> ✅ = coincide con los skill docs · ⚠️ = **drift** (doc desactualizado) · 🔶 = no verificable en estos nodos.

---

## 1. Páginas / secciones detectadas en Figma

**Foundations (`30:1750`)** contiene: Color Primitives · Color System (semantic) ·
Typography · Spacing Scale · Shadow Scale · Status Badges.
**Ui Guidelines (`120:157`)** contiene documentación de componentes (ver §4).

🔶 No se detectaron secciones de **Radius, Motion, Z‑index ni Breakpoints** en estos dos
nodos — existen solo en los docs/JSON; no verificables aquí.

---

## 2. Color — VERIFICADO contra Figma

### 2.1 Primitivos semánticos (Color System)
Backgrounds: bg.page `#F9FAFB` ✅ · bg.surface `#F3F4F6` ✅ · bg.card `#FFFFFF` ✅ ·
bg.input `#FFFFFF` ✅ · bg.tooltip `#111827` ✅
Text: text.primary `#111827` ✅ · text.secondary `#374151` ✅ · text.placeholder `#4B5563` ✅ ·
text.disabled `#6B7280` ✅ · text.link `#754BF1` ✅
Borders: border.default `#E5E7EB` ✅ · border.strong `#D0D5DD` ✅ · border.focus `#754BF1` ✅ ·
border.success `#027A48` ✅ · **border.error `#991F1F`** ⚠️ (docs dicen `#F04438`)
Actions: action.primary `#754BF1` ✅ · action.primary-hover `#6844D4` ✅ ·
action.secondary `#2D006D` ✅ · action.secondary-hover `#6844D4` ✅ ·
action.tertiary `#FFFFFF` ✅ · action.tertiary-border `#D0D5DD` ✅ · action.disabled `#D0D5DD` ✅
Figma anota: *"Intentional: darker default (purple/700), lighter hover (purple/600)"* ✅

### 2.2 Status (pares fg / bg) — ⚠️ DRIFT en los foregrounds
| Token | Figma fg | Doc fg | Figma bg | bg ok |
|---|---|---|---|---|
| success | `#027A48` | `#027A48` ✅ | `#E8FFF4` | ✅ |
| **error** | **`#991F1F`** | `#F04438` ⚠️ | `#FFDFDF` | ✅ |
| **warning** | **`#8A6500`** | `#F7B500` ⚠️ | `#FFF7E0` | ✅ |
| **alert** | **`#8B3A00`** | `#F7732A` ⚠️ | `#FBE7CB` | ✅ |
| info | `#2D006D` | `#2D006D` ✅ | `#F4F3FF` | ✅ |

> Los fg de Figma están **oscurecidos para pasar WCAG AA** sobre su bg claro.
> Los valores brillantes de los docs (`#F04438`, `#F7B500`, `#F7732A`) **fallarían contraste** como texto.

### 2.3 Primitivos base
neutral.0 `#FFFFFF` · neutral.50 `#F9FAFB` · neutral.100 `#F3F4F6` ✅
gray.50 `#E5E7EB` · gray.100 `#D0D5DD` · gray.200 `#6B7280` · gray.300 `#4B5563` ·
gray.400 `#374151` · gray.500 `#111827` ✅
purple 8 stops: 50 `#F4F3FF` · 100 `#E8E3FB` · 200 `#D1C7F6` · 300 `#B5A4F0` ·
400 `#9179EA` · 500 `#754BF1` · 600 `#6844D4` · 700 `#2D006D` ✅

**⚠️ Status primitivos — Figma NO usa numeración `50/100`, usa sufijos `.fg` / `.bg`:**
green.fg `#027A48` / green.bg `#E8FFF4` · **red.fg `#991F1F`** / red.bg `#FFDFDF` ·
**yellow.fg `#8A6500`** / yellow.bg `#FFF7E0` · **orange.fg `#8B3A00`** / orange.bg `#FBE7CB`
(los docs los nombran `green-50/green-100`, etc. → renombrar a `.fg/.bg`).

### 2.4 Chart ✅
series-1 `#754BF1` · series-2 `#B5A4F0` · series-3 `#9179EA` · reference `#D0D5DD` · axis `#4B5563`

---

## 3. Tipografía — VERIFICADO (⚠️ faltaban en design-tokens.md)

Figma define estilos semánticos completos que la referencia humana NO enumera:

| Estilo | Weight | Size | Tracking | Line-height |
|---|---|---|---|---|
| h1 | Bold | 36px | -0.04em | 1.15 |
| h2 | Bold | 28px | -0.02em | 1.15 |
| h3 | SemiBold | 22px | -0.01em | 1.30 |
| h4 | SemiBold | 17px | 0 | 1.30 |
| body.large | Regular | 17px | 0 | 1.60 |
| body.base | Regular | 16px | 0 | 1.50 |
| body.dense | Regular | 15px | 0 | 1.50 |
| body.sm | Regular | 14px | 0 | 1.50 |
| body.overline | SemiBold | 11px | 0.06em | 1.30 · ALL CAPS |
| component.label | Medium | 13px | 0 | 1.30 |
| component.badge | SemiBold | 11px | 0.025em | 1.30 |
| component.table-cell | Regular | 14px | — | tabular-nums |

Notas: `body.large` (17px) no se referenciaba en los docs. `h3` usa `-0.01em`, valor que
no existe en la escala nombrada de tracking (que salta de -0.02 a 0).

---

## 4. Componentes en Figma (Ui Guidelines)

**Documentados y coinciden con component-library.md:** Button (Default/Hover/Active/Focus/
Disabled/Loading × Primary/Secondary/Tertiary) · Input · Badge/Tag (+ variantes
status-outline, status-mini) · Table · Tabs · Toast · Tooltip · Modal · Cards · icons.

**⚠️ En Figma pero AUSENTES de component-library.md — agregar:**
- **Checkbox** — default, hover, focus, checked, indeterminate, disabled
- **Radio Button** — default, hover, focus, checked, disabled
- **Toggle**
- **Select · Multiselect · Combo** — default, hover, focus, filled, error, disabled · sizes XS 28 / SM 32 / MD 40
- **Chips · Filters** — default, activo, neutral, neutro-activo · 2 variantes (chips individuales vs. combinados)
- **Filter Panel**

🔶 **Alert Banners, Navigation (top/sidebar), Loading (skeleton/spinner)** están en los docs
pero NO aparecen como frames en esta página — verificar si viven en otra página o aún no en Figma.

Contexto observado: producto financiero MX (Velpay) — labels como CNBV, Liquidación,
BANORTE/BANCOMER, Venta/Reversa/Aprobada.

---

## 5. Shadow — VERIFICADO ✅ (con 1 conflicto)
xs `0 1px 2px rgba(0,0,0,.04)` · sm `+0 2px 8px rgba(0,0,0,.06)` ·
md `0 2px 4px/.04 + 0 8px 24px/.08` · lg `0 4px 8px/.04 + 0 16px 40px/.10` ·
xl `0 8px 16px/.06 + 0 24px 48px/.12` · card `0 0 0 1px/.04 + 0 2px 8px/.04` — todos ✅

**⚠️ shadow.focus — CONFLICTO:** Figma muestra `0 0 0 3px rgba(0,0,0,0.2)` (negro),
pero design-tokens.md y SKILL.md dicen púrpura `rgba(117,75,241,0.2)` y SKILL afirma
*"purple — never blue"*. **Requiere decisión:** ¿cuál es canónico?

---

## 6. Spacing — VERIFICADO ✅
space 1(4) · 2(8) · 3(12) · 4(16) · 5(20) · 6(24) · 8(32) · 10(40) · 12(48) · 16(64) ·
20(80) · 24(96) — con los mismos usos de los docs. Figma no muestra 0/px/0.5/1.5/7 en el showcase.

---

## 7. No verificable en estos nodos 🔶
Border radius · Motion (duration/easing) · Z‑index · Breakpoints.
Sigue abierto el **conflicto de easing** entre design-tokens.md y polish-and-craft.md.

---

## 8. Ediciones propuestas a los skills

**design-tokens.md**
1. status/error/warning/alert **fg** → `#991F1F` / `#8A6500` / `#8B3A00`.
2. `border.error` → `#991F1F`.
3. Renombrar primitivos de status `*-50/*-100` → `*.fg` / `*.bg`; corregir sus hex.
4. Agregar sección "Semantic Type Styles" (tabla §3 completa, incl. body.large).
5. shadow.focus: resolver conflicto (pendiente decisión).

**SKILL.md**
6. Tabla de status y checklist: reflejar fg oscurecidos + regla "status fg ya pasa AA, no usar los brillantes".
7. Nota sobre naming `.fg/.bg` de primitivos de status.

**component-library.md**
8. Agregar Checkbox, Radio, Toggle, Select/Multiselect/Combo, Chips/Filters, Filter Panel.
9. Corregir tokens de status fg en badges/alerts/toasts.
10. Marcar Alert/Nav/Loading como "verificar existencia en Figma".
