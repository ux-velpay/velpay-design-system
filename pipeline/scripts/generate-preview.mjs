/**
 * generate-preview.mjs — Librería visual del Design System VelPay.
 *
 * Lee los tokens JSON (fuente de verdad), resuelve los alias semántico→primitivo
 * y emite `_generated/preview.html`: un archivo autocontenido que se abre en el
 * navegador para consultar visualmente foundations y componentes.
 *
 * Regla del repo: "Figma manda, el repo refleja". Este archivo es GENERADO —
 * no editarlo a mano. Los valores de token se cambian en Figma y bajan por el
 * pipeline. Los componentes se renderizan según las specs de
 * `Components/Component Library.md`, pero todo color/spacing/tipo sale de los
 * tokens vía CSS variables.
 *
 * Uso:  cd pipeline && npm run gen:preview
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");            // repo root
// Casing correcto (Foundations con mayúscula) — CI-safe, a diferencia del bug
// conocido en style-dictionary.config.mjs.
const TOK = resolve(ROOT, "Foundations", "tokens");
const ICONS_DIR = resolve(ROOT, "Foundations", "icons");
const OUT_DIR = resolve(ROOT, "_generated");
const OUT = resolve(OUT_DIR, "preview.html");

const readJson = async (f) => JSON.parse(await readFile(resolve(TOK, f), "utf8"));

const [colorPrim, typePrim, colorSem, typeSem, layout] = await Promise.all([
  readJson("color-primitives.json"),
  readJson("typography-primitives.json"),
  readJson("color-semantic.json"),
  readJson("typography-semantic.json"),
  readJson("layout-tokens.json"),
]);

/* ── Iconos (Heroicons, inline SVG) ──────────────────────────────────── */
// Lee Foundations/icons/*.svg y los normaliza: quita width/height fijos para
// que el tamaño lo controle CSS, y garantiza stroke=currentColor (se colorean
// con el token del contexto). Fuente de verdad de los iconos = esos SVG.
const iconMap = {};
try {
  const files = (await readdir(ICONS_DIR)).filter((f) => f.endsWith(".svg"));
  for (const f of files) {
    const name = f.replace(/\.svg$/, "");
    let svg = await readFile(resolve(ICONS_DIR, f), "utf8");
    svg = svg
      .replace(/\s(width|height)="[^"]*"/g, "")            // sin tamaño fijo → lo pone CSS
      .replace(/<svg /, '<svg class="icon" ')              // clase para dimensionar
      .replace(/\sdata-slot="[^"]*"/g, "")
      .replace(/\s*\n\s*/g, " ")                            // una sola línea
      .trim();
    iconMap[name] = svg;
  }
} catch { /* carpeta de iconos opcional */ }
const iconNames = Object.keys(iconMap).sort();
// Helper: inserta un icono por nombre. `extra` permite override de tamaño inline.
const icon = (name, extra = "") => {
  const svg = iconMap[name];
  if (!svg) return "";
  return extra ? svg.replace('class="icon"', `class="icon" style="${extra}"`) : svg;
};

/* ── Resolución de tokens ─────────────────────────────────────────────── */
// Aplana un árbol DTCG en un mapa { "a.b.c": rawValue }.
const flat = {};
function walk(node, path = []) {
  if (node && typeof node === "object" && "$value" in node) {
    flat[path.join(".")] = node.$value;
    return;
  }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      if (k.startsWith("$")) continue;
      walk(node[k], [...path, k]);
    }
  }
}
[colorPrim, typePrim, colorSem, typeSem, layout].forEach((t) => walk(t));

// Resuelve refs {a.b.c} de forma recursiva (soporta strings y objetos).
function resolve$(v, seen = 0) {
  if (seen > 20) return v;
  if (typeof v === "string") {
    const m = v.match(/^\{(.+)\}$/);
    if (m) return resolve$(flat[m[1]], seen + 1);
    return v;
  }
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) out[k] = resolve$(v[k], seen + 1);
    return out;
  }
  return v;
}

/* ── CSS variables desde tokens ──────────────────────────────────────── */
const cssVars = [];
const push = (name, val) => cssVars.push(`    ${name}: ${val};`);

// Primitivos de color: --color-neutral-0, --color-purple-500, ...
walkEmit(colorPrim, "color");
// Semánticos: --bg-surface, --action-primary, --status-success-bg, ...
for (const group of Object.keys(colorSem)) {
  for (const key of Object.keys(colorSem[group])) {
    const val = resolve$(colorSem[group][key].$value);
    if (typeof val === "number") continue; // p.ej. chart.fill-opacity
    push(`--${group}-${key}`, String(val));
  }
}
// Layout: space / radius / shadow / z / duration / easing / breakpoint
emitLayout("space", "space");
emitLayout("radius", "radius");
emitLayout("shadow", "shadow");
emitLayout("z", "z");
emitLayout("duration", "duration");
emitLayout("easing", "easing");
emitLayout("breakpoint", "bp");

function walkEmit(tree, prefix) {
  const rec = (node, path) => {
    if (node && typeof node === "object" && "$value" in node) {
      push(`--${[prefix, ...path].join("-")}`, String(resolve$(node.$value)));
      return;
    }
    if (node && typeof node === "object")
      for (const k of Object.keys(node)) if (!k.startsWith("$")) rec(node[k], [...path, k]);
  };
  // color-primitives tiene raíz "color" — descендemos una vez.
  const root = tree.color || tree;
  for (const k of Object.keys(root)) rec(root[k], [k]);
}

function emitLayout(group, prefix) {
  const node = layout[group];
  if (!node) return;
  for (const k of Object.keys(node)) {
    const val = resolve$(node[k].$value);
    push(`--${prefix}-${k}`, String(val));
  }
}

/* ── Clases de tipografía semántica ──────────────────────────────────── */
const typeClasses = [];
function typeToCss(tokenObj) {
  const v = resolve$(tokenObj.$value);
  const decl = [];
  if (v.fontFamily) decl.push(`font-family: '${v.fontFamily}', -apple-system, system-ui, sans-serif`);
  if (v.fontWeight) decl.push(`font-weight: ${v.fontWeight}`);
  if (v.fontSize) decl.push(`font-size: ${v.fontSize}`);
  if (v.letterSpacing) decl.push(`letter-spacing: ${v.letterSpacing}`);
  if (v.lineHeight) decl.push(`line-height: ${v.lineHeight}`);
  if (v.textCase) decl.push(`text-transform: ${v.textCase}`);
  if (v.fontVariantNumeric) decl.push(`font-variant-numeric: ${v.fontVariantNumeric}`);
  return { decl, v };
}
const typeScale = [];
for (const key of Object.keys(typeSem)) {
  const node = typeSem[key];
  if ("$value" in node) {
    const { decl, v } = typeToCss(node);
    typeClasses.push(`  .type-${key} { ${decl.join("; ")}; }`);
    typeScale.push({ name: key, v });
  } else {
    for (const sub of Object.keys(node)) {
      const { decl, v } = typeToCss(node[sub]);
      const cls = `${key}-${sub}`;
      typeClasses.push(`  .type-${cls} { ${decl.join("; ")}; }`);
      typeScale.push({ name: `${key}.${sub}`, v });
    }
  }
}

/* ── Datos para render de foundations ────────────────────────────────── */
const flatHex = (obj, prefix) => {
  const out = [];
  const rec = (node, path) => {
    if (node && typeof node === "object" && "$value" in node) {
      out.push({ path: path.join("."), value: resolve$(node.$value), varName: `--${[prefix, ...path].join("-")}` });
      return;
    }
    if (node && typeof node === "object")
      for (const k of Object.keys(node)) if (!k.startsWith("$")) rec(node[k], [...path, k]);
  };
  const root = obj.color || obj;
  for (const k of Object.keys(root)) rec(root[k], [k]);
  return out;
};
const primitiveColors = flatHex(colorPrim, "color");

const semanticColors = [];
for (const group of Object.keys(colorSem)) {
  for (const key of Object.keys(colorSem[group])) {
    const raw = colorSem[group][key].$value;
    const val = resolve$(raw);
    if (typeof val === "number") continue;
    semanticColors.push({
      group,
      name: `${group}.${key}`,
      alias: typeof raw === "string" ? raw : "",
      value: val,
      varName: `--${group}-${key}`,
    });
  }
}

const spaceScale = Object.keys(layout.space).map((k) => ({ name: k, value: resolve$(layout.space[k].$value) }));
const radiusScale = Object.keys(layout.radius).map((k) => ({ name: k, value: resolve$(layout.radius[k].$value) }));
const shadowScale = Object.keys(layout.shadow).map((k) => ({ name: k, value: resolve$(layout.shadow[k].$value) }));

/* ── Matriz de estado (leída de Component Status.md, no duplicada) ───── */
let statusRows = [];
try {
  const md = await readFile(resolve(ROOT, "Components", "Component Status.md"), "utf8");
  statusRows = md
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && !l.includes("---") && !/Componente\s*\|/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()).filter(Boolean))
    .filter((cols) => cols.length >= 4)
    .map(([componente, figma, doc, estado, nota = ""]) => ({ componente, figma, doc, estado, nota }));
} catch { /* opcional */ }

/* ── Helpers de plantilla ────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const swatch = (c) => `
  <div class="swatch">
    <div class="swatch-chip" style="background: ${c.value}"></div>
    <div class="swatch-meta">
      <code class="swatch-name">${esc(c.name)}</code>
      ${c.alias ? `<code class="swatch-alias">${esc(c.alias)}</code>` : ""}
      <code class="swatch-val">${esc(c.value)}</code>
    </div>
  </div>`;

const statusEmoji = (e) => e || "";

/* ── HTML ────────────────────────────────────────────────────────────── */
/* ── Matriz de estados de botones ────────────────────────────────────── */
const btnVariants = [
  { label: "Primary", cls: "btn-primary" },
  { label: "Secondary", cls: "btn-secondary" },
  { label: "Tertiary", cls: "btn-tertiary" },
  { label: "Ghost", cls: "btn-ghost" },
  { label: "Destructive", cls: "btn-destructive" },
];
const btnStates = ["Default", "Hover", "Pressed", "Focus", "Disabled", "Loading"];
const btnCell = (v, state) => {
  const base = `btn ${v.cls}`;
  switch (state) {
    case "Hover": return `<button class="${base} b-hover">${v.label}</button>`;
    case "Pressed": return `<button class="${base} b-pressed">${v.label}</button>`;
    case "Focus": return `<button class="${base} b-focus">${v.label}</button>`;
    case "Disabled": return `<button class="${base}" disabled>${v.label}</button>`;
    case "Loading": return `<button class="${base}"><span class="btn-spin"></span></button>`;
    default: return `<button class="${base}">${v.label}</button>`;
  }
};
const buttonStatesGrid = `
        <div class="states-grid">
          <div></div>
          ${btnStates.map((s) => `<div class="sg-head">${s}</div>`).join("")}
          ${btnVariants.map((v) => `
            <div class="sg-rowlabel">${v.label}</div>
            ${btnStates.map((s) => `<div class="sg-cell">${btnCell(v, s)}</div>`).join("")}
          `).join("")}
        </div>`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VelPay Design System — Librería visual</title>
<style>
  :root {
${cssVars.join("\n")}
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: var(--text-primary);
    background: var(--bg-page);
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--text-link); }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  /* Regla del sistema: nunca semibold ni bold — todo máximo medium (500). */
  strong, b, h1, h2, h3, h4, h5, h6 { font-weight: 500; }

  /* Iconos — Heroicons inline. Toman color del contexto vía currentColor. */
  .icon { width: 20px; height: 20px; display: inline-block; vertical-align: middle; flex: none; }

  /* Grilla de iconografía */
  .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-3); }
  .icon-cell { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-2); display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
    color: var(--text-primary); }
  .icon-cell .icon { width: 24px; height: 24px; }
  .icon-cell code { font-size: 10px; color: var(--text-secondary); text-align: center; word-break: break-word; }

  /* Layout: sidebar + content */
  .layout { display: flex; min-height: 100vh; }
  .sidebar {
    position: sticky; top: 0; align-self: flex-start;
    width: 240px; height: 100vh; overflow-y: auto;
    background: var(--bg-card); border-right: 1px solid var(--border-default);
    padding: var(--space-6) var(--space-4); flex-shrink: 0;
  }
  .sidebar h1 { font-size: 15px; font-weight: 500; margin: 0 0 2px; letter-spacing: -0.01em; }
  .sidebar .tag { font-size: 11px; color: var(--text-secondary); margin-bottom: var(--space-6); display: block; }
  .sidebar nav a {
    display: block; padding: 6px 10px; margin: 1px 0; border-radius: var(--radius-md);
    color: var(--text-secondary); text-decoration: none; font-size: 13px; font-weight: 500;
  }
  .sidebar nav a:hover { background: var(--bg-surface); color: var(--text-primary); }
  .sidebar nav .group { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-placeholder); margin: var(--space-5) 0 4px; padding: 0 10px; font-weight: 500; }

  .content { flex: 1; max-width: 980px; padding: var(--space-10) var(--space-12); margin: 0 auto; }
  section { margin-bottom: var(--space-24); scroll-margin-top: var(--space-6); }
  section > h2 { font-size: 28px; font-weight: 500; letter-spacing: -0.02em; margin: 0 0 4px; }
  section > .lead { color: var(--text-secondary); margin: 0 0 var(--space-8); font-size: 15px; }
  h3.sub { font-size: 17px; font-weight: 500; margin: var(--space-10) 0 var(--space-4); }
  .hint { font-size: 13px; color: var(--text-secondary); margin: 0 0 var(--space-4); }

  .banner {
    background: var(--status-info-bg); color: var(--status-info);
    border-left: 3px solid var(--border-focus); border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4); font-size: 13px; margin-bottom: var(--space-8);
  }

  /* Divisor de plataforma (Web / Mobile) */
  .platform-hd { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--action-primary); margin: var(--space-16) 0 var(--space-8); padding-bottom: var(--space-3);
    border-bottom: 2px solid var(--action-primary); display: flex; align-items: baseline; gap: var(--space-3); }
  .platform-hd small { font-size: 12px; font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--text-secondary); }
  .placeholder { background: var(--bg-card); border: 1px dashed var(--border-strong); border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-10); color: var(--text-secondary); }
  .placeholder h3 { margin: 0 0 var(--space-3); color: var(--text-primary); font-size: 17px; }
  .placeholder ul { margin: var(--space-4) 0 0; padding-left: var(--space-5); line-height: 1.8; font-size: 14px; }

  /* Foundations grids */
  .swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-4); }
  .swatch { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
  .swatch-chip { height: 56px; border-bottom: 1px solid var(--border-default); }
  .swatch-meta { padding: var(--space-2) var(--space-3); display: flex; flex-direction: column; gap: 2px; }
  .swatch-name { font-size: 12px; font-weight: 500; }
  .swatch-alias { font-size: 11px; color: var(--text-link); }
  .swatch-val { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }

  .space-row { display: flex; align-items: center; gap: var(--space-4); margin-bottom: 6px; font-size: 13px; }
  .space-row .bar { background: var(--action-primary); height: 16px; border-radius: 2px; }
  .space-row .lbl { width: 90px; color: var(--text-secondary); }

  .radius-grid, .shadow-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-4); }
  .radius-demo { height: 72px; background: var(--action-primary); }
  .card-lite { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
  .card-lite .cap { padding: 8px 12px; font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between; }
  .shadow-demo { height: 64px; margin: 20px; background: var(--bg-card); border-radius: var(--radius-md); }

  .type-row { padding: var(--space-4) 0; border-bottom: 1px solid var(--border-default); }
  .type-row .meta { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

  /* Component demos */
  .demo { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
    padding: var(--space-6); margin-bottom: var(--space-4); box-shadow: var(--shadow-card); }
  .demo-row { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }
  .demo-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-placeholder);
    font-weight: 500; margin-bottom: var(--space-3); }

  /* Buttons (specs de Component Library.md) */
  .btn { font-family: inherit; font-size: 14px; font-weight: 500; height: 40px; padding: 0 20px; /* medium (font.weight.medium) */
    border-radius: var(--radius-md); border: 1px solid transparent; cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px; transition: background var(--duration-fast) var(--easing-out); }
  .btn-primary { background: var(--action-primary); color: var(--action-primary-text); }
  .btn-primary:hover { background: var(--action-primary-hover); }
  .btn-secondary { background: transparent; color: var(--action-secondary); border-color: var(--action-secondary); }
  .btn-secondary:hover { background: var(--action-secondary-hover); color: var(--action-secondary-text-hover); border-color: var(--action-secondary-hover); }
  .btn-tertiary { background: var(--action-tertiary); color: var(--action-tertiary-text); border-color: var(--action-tertiary-border); box-shadow: var(--shadow-xs); }
  .btn-tertiary:hover { background: var(--action-tertiary-hover); border-color: var(--action-tertiary-border-hover); }
  .btn-ghost { background: transparent; color: var(--text-primary); }
  .btn-ghost:hover { background: var(--bg-surface); }
  .btn-destructive { background: var(--status-error); color: var(--neutral-0, #fff); }
  .btn:disabled, .btn-disabled { background: var(--action-disabled); color: var(--action-disabled-text); cursor: not-allowed; border-color: transparent; box-shadow: none; }
  .btn:focus-visible { outline: none; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }

  .btn-xs { height: 28px; font-size: 12px; padding: 0 12px; }
  .btn-sm { height: 32px; font-size: 13px; padding: 0 14px; }
  .btn-lg { height: 44px; font-size: 15px; padding: 0 24px; }
  .btn-xl { height: 56px; font-size: 16px; padding: 0 32px; }

  /* Estados forzados (para mostrar cada estado estático en la matriz) */
  .b-focus { border-color: var(--border-focus) !important; box-shadow: var(--shadow-focus) !important; }
  .b-pressed { transform: scale(0.96); }
  .btn-primary.b-hover, .btn-primary.b-pressed { background: var(--action-primary-hover); }
  .btn-secondary.b-hover, .btn-secondary.b-pressed { background: var(--action-secondary-hover); color: var(--action-secondary-text-hover); border-color: var(--action-secondary-hover); }
  .btn-tertiary.b-hover, .btn-tertiary.b-pressed { background: var(--action-tertiary-hover); border-color: var(--action-tertiary-border-hover); }
  .btn-ghost.b-hover, .btn-ghost.b-pressed { background: var(--bg-surface); }
  .btn-destructive.b-hover, .btn-destructive.b-pressed { filter: brightness(0.9); }
  .btn-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor;
    border-top-color: transparent; opacity: 0.9; animation: spin var(--duration-slow) linear infinite; }

  /* Matriz de estados */
  .states-grid { display: grid; grid-template-columns: 96px repeat(6, minmax(88px, 1fr));
    gap: var(--space-4) var(--space-3); align-items: center; overflow-x: auto; }
  .sg-head { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-placeholder);
    font-weight: 500; text-align: center; }
  .sg-rowlabel { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
  .sg-cell { display: flex; justify-content: center; }
  .sg-cell .btn { font-size: 13px; padding: 0 14px; }

  /* Inputs */
  .field { display: flex; flex-direction: column; gap: var(--space-2); max-width: 280px; }
  .field label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
  .input { height: 40px; padding: 0 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);
    background: var(--bg-input); font-family: inherit; font-size: 14px; color: var(--text-primary); box-shadow: var(--shadow-xs); }
  .input::placeholder { color: var(--text-placeholder); }
  .input:hover { border-color: var(--border-strong); }
  .input:focus { outline: none; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }
  .input-error { border-color: var(--border-error); }
  .input-success { border-color: var(--border-success); }
  .input:disabled { background: var(--bg-surface); color: var(--text-disabled); cursor: not-allowed; }
  .helper { font-size: 13px; color: var(--text-secondary); }
  .helper-error { color: var(--status-error); }
  .helper-success { color: var(--status-success); }

  /* Select / Dropdown */
  .select { display: flex; flex-direction: column; gap: var(--space-2); max-width: 260px; }
  .select-trigger { height: 40px; padding: 0 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);
    background: var(--bg-input); font-size: 14px; color: var(--text-primary); box-shadow: var(--shadow-xs);
    display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; }
  .select-trigger .icon { width: 18px; height: 18px; color: var(--text-secondary); }
  .select-trigger.placeholder { color: var(--text-placeholder); }
  .select-trigger.is-hover { border-color: var(--border-strong); }
  .select-trigger.is-focus { border-color: var(--border-focus); box-shadow: var(--shadow-focus); }
  .select-trigger.is-error { border-color: var(--border-error); }
  .select-trigger.is-disabled { background: var(--bg-surface); color: var(--text-disabled); cursor: not-allowed; }
  .select-menu { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md);
    box-shadow: var(--shadow-md); padding: 6px; }
  .select-opt { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px;
    border-radius: var(--radius-sm); font-size: 14px; color: var(--text-primary); cursor: pointer; }
  .select-opt .icon { width: 16px; height: 16px; color: var(--action-primary); }
  .select-opt.is-hover { background: var(--bg-surface); }
  .select-opt.is-selected { background: var(--status-info-bg); color: var(--status-info); }

  /* Badges */
  .badge { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px;
    border-radius: var(--radius-full); font-size: 11px; font-weight: 500; letter-spacing: 0.025em; }
  .badge-success { background: var(--status-success-bg); color: var(--status-success); }
  .badge-error { background: var(--status-error-bg); color: var(--status-error); }
  .badge-warning { background: var(--status-warning-bg); color: var(--status-warning); }
  .badge-alert { background: var(--status-alert-bg); color: var(--status-alert); }
  .badge-info { background: var(--status-info-bg); color: var(--status-info); }

  /* Chips */
  .chip { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
    border-radius: var(--radius-full); font-size: 13px; font-weight: 500; cursor: pointer;
    background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-default); }
  .chip-active { background: var(--status-info-bg); color: var(--status-info); border-color: var(--border-focus); }
  .chip .x { opacity: .6; }

  /* Card */
  .ds-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card); padding: var(--space-6); max-width: 320px; }
  .ds-card .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); font-weight: 500; }
  .ds-card h4 { margin: 6px 0; font-size: 17px; }
  .ds-card p { margin: 0 0 var(--space-4); color: var(--text-secondary); font-size: 14px; line-height: 1.5; }

  /* Table */
  table.ds { width: 100%; border-collapse: collapse; font-size: 14px; }
  table.ds th { text-align: left; background: var(--bg-surface); color: var(--text-secondary);
    font-weight: 500; padding: 10px 12px; font-size: 13px; }
  table.ds td { padding: 12px; border-top: 1px solid var(--border-default); }
  table.ds td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.ds tbody tr:hover { background: var(--bg-surface); }

  /* Tabs */
  .tabs { display: flex; gap: var(--space-6); border-bottom: 1px solid var(--border-default); }
  .tabs .tab { padding: 10px 2px; font-size: 14px; font-weight: 500; color: var(--text-secondary);
    border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; }
  .tabs .tab.active { color: var(--text-primary); border-bottom-color: var(--border-focus); }

  /* Toggle / checkbox / radio */
  .toggle { width: 44px; height: 24px; border-radius: var(--radius-full); background: var(--border-strong);
    position: relative; cursor: pointer; transition: background var(--duration-fast) var(--easing-in-out); }
  .toggle.on { background: var(--action-primary); }
  .toggle .thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
    background: #fff; transition: transform var(--duration-fast) var(--easing-in-out); box-shadow: var(--shadow-xs); }
  .toggle.on .thumb { transform: translateX(20px); }
  .check { width: 20px; height: 20px; border-radius: var(--radius-sm); border: 1px solid var(--border-default);
    background: var(--bg-input); display: inline-flex; align-items: center; justify-content: center; }
  .check.checked { background: var(--action-primary); border-color: var(--action-primary); color: #fff; font-size: 13px; }
  .radio { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border-default);
    background: var(--bg-input); display: inline-flex; align-items: center; justify-content: center; }
  .radio.checked { border-color: var(--action-primary); }
  .radio.checked::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--action-primary); }

  /* Tooltip / toast / alert / modal */
  .tooltip { display: inline-block; background: var(--bg-tooltip); color: #fff; font-size: 13px;
    padding: 8px 12px; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); max-width: 240px; }
  .alert { border-radius: var(--radius-md); padding: 12px 16px; font-size: 14px; display: flex; gap: 10px;
    border-left: 3px solid; margin-bottom: var(--space-3); }
  .alert-success { background: var(--status-success-bg); color: var(--status-success); border-left-color: var(--status-success); }
  .alert-error { background: var(--status-error-bg); color: var(--status-error); border-left-color: var(--status-error); }
  .alert-warning { background: var(--status-warning-bg); color: var(--status-warning); border-left-color: var(--status-warning); }
  .alert-info { background: var(--status-info-bg); color: var(--status-info); border-left-color: var(--border-focus); }
  .toast { background: var(--bg-card); border: 1px solid var(--border-default); border-left: 3px solid var(--status-success);
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm); padding: 12px 16px; max-width: 360px; font-size: 14px;
    display: flex; gap: 10px; align-items: flex-start; }
  .modal { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
    padding: var(--space-6); max-width: 400px; border: 1px solid var(--border-default); }
  .skeleton { background: var(--bg-surface); border-radius: var(--radius-sm); position: relative; overflow: hidden; }
  .skeleton::after { content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, var(--border-default), transparent);
    animation: shimmer var(--duration-slow) linear infinite; }
  @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  .spinner { width: 20px; height: 20px; border: 2px solid var(--border-default); border-top-color: var(--action-primary);
    border-radius: 50%; animation: spin var(--duration-slow) linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Patterns — recipe cards (composiciones) */
  .recipe-stage { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
    padding: var(--space-10); display: flex; justify-content: center; }
  .recipe-meta { margin-top: var(--space-3); font-size: 13px; color: var(--text-secondary);
    display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .recipe-meta .part { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-sm);
    padding: 2px 8px; font-size: 12px; color: var(--text-primary); }

  .modal-lg { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-default); width: 480px; max-width: 100%; overflow: hidden; }
  .modal-head { display: flex; align-items: center; justify-content: space-between;
    padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--border-default); }
  .modal-head h4 { margin: 0; font-size: 17px; }
  .modal-body { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
  .modal-foot { display: flex; justify-content: flex-end; gap: var(--space-3);
    padding: var(--space-5) var(--space-6); border-top: 1px solid var(--border-default); }
  .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--text-secondary);
    display: inline-flex; padding: 4px; border-radius: var(--radius-sm); }
  .icon-btn:hover { background: var(--bg-surface); }

  .dropzone { border: 1.5px dashed var(--border-strong); border-radius: var(--radius-md); padding: var(--space-8);
    text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-2); color: var(--text-secondary); }
  .dropzone .icon { width: 32px; height: 32px; color: var(--action-primary); }
  .dropzone strong { color: var(--text-primary); }

  .file-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3);
    border: 1px solid var(--border-default); border-radius: var(--radius-md); }
  .file-row > .icon:first-child { color: var(--text-secondary); flex: none; }
  .file-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .file-name { font-size: 14px; color: var(--text-primary); }
  .file-sub { font-size: 12px; color: var(--text-secondary); }
  .file-sub.err { color: var(--status-error); }
  .progress { height: 6px; background: var(--bg-surface); border-radius: var(--radius-full); overflow: hidden; margin-top: 4px; }
  .progress > i { display: block; height: 100%; background: var(--action-primary); border-radius: inherit; }

  /* Status matrix */
  table.status { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.status th { text-align: left; background: var(--bg-surface); color: var(--text-secondary); padding: 8px 12px; font-weight: 500; }
  table.status td { padding: 8px 12px; border-top: 1px solid var(--border-default); }

  footer { color: var(--text-secondary); font-size: 12px; border-top: 1px solid var(--border-default);
    padding-top: var(--space-6); margin-top: var(--space-16); }
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <h1>VelPay DS</h1>
    <span class="tag">Librería visual · generada</span>
    <nav>
      <div class="group">Foundations</div>
      <a href="#colors-semantic">Color · Semántico</a>
      <a href="#colors-primitive">Color · Primitivos</a>
      <a href="#type">Tipografía</a>
      <a href="#icons">Iconografía</a>
      <a href="#spacing">Spacing</a>
      <a href="#radius">Radius</a>
      <a href="#shadow">Elevation</a>
      <div class="group">Componentes · Web</div>
      <a href="#buttons">Buttons</a>
      <a href="#inputs">Inputs</a>
      <a href="#dropdown">Select · Dropdown</a>
      <a href="#selection">Checkbox · Radio · Toggle</a>
      <a href="#badges">Badges · Chips</a>
      <a href="#card">Card</a>
      <a href="#table">Table</a>
      <a href="#tabs">Tabs</a>
      <a href="#feedback">Alert · Toast · Tooltip</a>
      <a href="#modal">Modal</a>
      <a href="#loading">Loading</a>
      <div class="group">Componentes · Mobile</div>
      <a href="#mobile">Pendiente por definir</a>
      <div class="group">Patterns · Modales</div>
      <a href="#pat-upload">Subir documentos</a>
      <div class="group">Meta</div>
      <a href="#status">Component Status</a>
    </nav>
  </aside>

  <main class="content">
    <div class="banner">
      🔒 Archivo <strong>generado</strong> por <code>npm run gen:preview</code> desde los tokens JSON.
      No editar a mano — los valores se cambian en Figma y bajan por el pipeline.
    </div>

    <section id="colors-semantic">
      <h2>Color — Semántico</h2>
      <p class="lead">Tokens que los componentes SÍ deben usar. Cada uno referencia (alias) un primitivo.</p>
      ${["bg", "text", "border", "action", "status", "chart"].map((g) => {
        const items = semanticColors.filter((c) => c.group === g);
        if (!items.length) return "";
        return `<h3 class="sub">${g}</h3><div class="swatch-grid">${items.map(swatch).join("")}</div>`;
      }).join("")}
    </section>

    <section id="colors-primitive">
      <h2>Color — Primitivos</h2>
      <p class="lead">Valores crudos, sin semántica. Los componentes NUNCA los usan directo.</p>
      <div class="swatch-grid">${primitiveColors.map(swatch).join("")}</div>
    </section>

    <section id="type">
      <h2>Tipografía</h2>
      <p class="lead">Familia ${esc(resolve$(flat["font.family"]))}. Escala tipográfica semántica.</p>
      ${typeScale.map((t) => `
        <div class="type-row">
          <div class="type-${t.name.replace(".", "-")}">VelPay — El zorro veloz salta 1,234.56</div>
          <div class="meta"><code>${esc(t.name)}</code> · ${esc(t.v.fontSize || "")} / ${esc(t.v.fontWeight || "")} / lh ${esc(t.v.lineHeight || "")}</div>
        </div>`).join("")}
    </section>

    <section id="icons">
      <h2>Iconografía</h2>
      <p class="lead">Heroicons (outline · 24px · stroke 1.5). Se colorean con <code>currentColor</code>,
      así que heredan el color del contexto donde se usan. ${iconNames.length} iconos en la curaduría.</p>
      <div class="icon-grid">
        ${iconNames.map((n) => `<div class="icon-cell">${icon(n)}<code>${esc(n)}</code></div>`).join("")}
      </div>
      <p class="hint" style="margin-top:16px">Fuente: <code>Foundations/icons/*.svg</code>. Para agregar más,
      copia el SVG de Heroicons ahí y regenera — aparece solo en esta grilla.</p>
    </section>

    <section id="spacing">
      <h2>Spacing</h2>
      <p class="lead">Escala base 4px.</p>
      ${spaceScale.map((s) => `
        <div class="space-row">
          <span class="lbl">space.${esc(s.name)}</span>
          <span class="bar" style="width: ${s.value}"></span>
          <code>${esc(s.value)}</code>
        </div>`).join("")}
    </section>

    <section id="radius">
      <h2>Radius</h2>
      <div class="radius-grid">
        ${radiusScale.map((r) => `
          <div class="card-lite">
            <div class="radius-demo" style="border-radius: ${r.value} ${r.value} 0 0"></div>
            <div class="cap"><code>radius.${esc(r.name)}</code><span>${esc(r.value)}</span></div>
          </div>`).join("")}
      </div>
    </section>

    <section id="shadow">
      <h2>Elevation</h2>
      <div class="shadow-grid">
        ${shadowScale.map((s) => `
          <div class="card-lite" style="background: var(--bg-page)">
            <div class="shadow-demo" style="box-shadow: ${s.value}"></div>
            <div class="cap"><code>shadow.${esc(s.name)}</code></div>
          </div>`).join("")}
      </div>
    </section>

    <div class="platform-hd" id="web">Componentes — Web <small>escritorio · densidad estándar · targets desde XS (28px)</small></div>

    <section id="buttons">
      <h2>Buttons</h2>
      <p class="lead">3 variantes de marca + ghost + destructive. Comparten alturas con los inputs.</p>
      <div class="demo">
        <div class="demo-label">Variantes (MD · 40px)</div>
        <div class="demo-row">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-secondary">Secondary</button>
          <button class="btn btn-tertiary">Tertiary</button>
          <button class="btn btn-ghost">Ghost</button>
          <button class="btn btn-destructive">Destructive</button>
          <button class="btn btn-primary" disabled>Disabled</button>
        </div>
      </div>
      <div class="demo">
        <div class="demo-label">Estados por variante</div>
        ${buttonStatesGrid}
        <p class="hint" style="margin-top:20px">Hover/Pressed/Focus/Disabled/Loading mostrados de forma estática. En uso real, Focus aparece solo con teclado (<code>:focus-visible</code>) y Loading reemplaza el label por un spinner del mismo tamaño.</p>
      </div>
      <div class="demo">
        <div class="demo-label">Escala de tamaños</div>
        <div class="demo-row">
          <button class="btn btn-primary btn-xs">XS · 28</button>
          <button class="btn btn-primary btn-sm">SM · 32</button>
          <button class="btn btn-primary">MD · 40</button>
          <button class="btn btn-primary btn-lg">LG · 44</button>
          <button class="btn btn-primary btn-xl">XL · 56</button>
        </div>
        <p class="hint" style="margin-top:16px">⚠ XS y SM son solo desktop. En mobile, mínimo LG (44px).</p>
      </div>
      <div class="demo">
        <div class="demo-label">Iconos en botones (leading · trailing · solo icono)</div>
        <div class="demo-row">
          <button class="btn btn-primary">${icon("plus")} Nuevo cobro</button>
          <button class="btn btn-tertiary">Exportar ${icon("arrow-up-right")}</button>
          <button class="btn btn-tertiary" aria-label="Buscar" style="padding:0 12px">${icon("magnifying-glass")}</button>
          <button class="btn btn-ghost">${icon("pencil-square")} Editar</button>
        </div>
        <p class="hint" style="margin-top:16px">Solo-icono siempre lleva <code>aria-label</code>. Los iconos toman el color del texto del botón vía <code>currentColor</code>.</p>
      </div>
    </section>

    <section id="inputs">
      <h2>Inputs</h2>
      <div class="demo">
        <div class="demo-row" style="align-items: flex-start">
          <div class="field"><label>Default</label><input class="input" placeholder="Escribe aquí…"></div>
          <div class="field"><label>Focus (borde púrpura)</label><input class="input" style="border-color: var(--border-focus); box-shadow: var(--shadow-focus)" value="En foco"></div>
          <div class="field"><label>Error</label><input class="input input-error" value="valor@"><span class="helper helper-error">Correo inválido</span></div>
          <div class="field"><label>Success</label><input class="input input-success" value="ok@velpay.com"><span class="helper helper-success">Disponible</span></div>
          <div class="field"><label>Disabled</label><input class="input" value="No editable" disabled></div>
        </div>
      </div>
    </section>

    <section id="dropdown">
      <h2>Select · Dropdown</h2>
      <p class="lead">Trigger + menú desplegable. Estados: default · hover · focus · filled · error · disabled.
      Tamaños XS/SM/MD (XS/SM solo desktop). Menú: <code>bg.card</code> · <code>shadow.md</code> · <code>z.dropdown</code> (100).</p>
      <div class="demo">
        <div class="demo-label">Estados del trigger</div>
        <div class="demo-row" style="align-items:flex-start">
          <div class="select"><div class="select-trigger placeholder">Selecciona plataforma ${icon("chevron-down")}</div></div>
          <div class="select"><div class="select-trigger is-hover">Terminal POS ${icon("chevron-down")}</div></div>
          <div class="select"><div class="select-trigger is-focus">Terminal POS ${icon("chevron-down")}</div></div>
          <div class="select"><div class="select-trigger is-error">Selecciona… ${icon("chevron-down")}</div><span class="helper helper-error">${icon("exclamation-circle", "width:14px;height:14px")} Campo requerido</span></div>
          <div class="select"><div class="select-trigger is-disabled">No disponible ${icon("chevron-down")}</div></div>
        </div>
      </div>
      <div class="demo">
        <div class="demo-label">Menú abierto (filled + opción seleccionada)</div>
        <div class="select">
          <div class="select-trigger is-focus">Terminal POS ${icon("chevron-down")}</div>
          <div class="select-menu">
            <div class="select-opt is-selected">Terminal POS ${icon("check")}</div>
            <div class="select-opt is-hover">mPOS</div>
            <div class="select-opt">P5</div>
            <div class="select-opt">D60</div>
            <div class="select-opt">Payment Links</div>
          </div>
        </div>
      </div>
      <div class="demo">
        <div class="demo-label">Multiselect (valores como chips)</div>
        <div class="select" style="max-width:360px">
          <div class="select-trigger" style="height:auto;min-height:40px;padding:6px 12px;flex-wrap:wrap;justify-content:flex-start">
            <span class="chip chip-active" style="height:24px">Aprobadas ${icon("x-mark", "width:12px;height:12px")}</span>
            <span class="chip chip-active" style="height:24px">Pendientes ${icon("x-mark", "width:12px;height:12px")}</span>
            <span style="margin-left:auto">${icon("chevron-down")}</span>
          </div>
        </div>
      </div>
      <div class="demo">
        <div class="demo-label">Tamaños</div>
        <div class="demo-row">
          <div class="select" style="max-width:160px"><div class="select-trigger" style="height:28px;font-size:12px">XS · 28 ${icon("chevron-down", "width:14px;height:14px")}</div></div>
          <div class="select" style="max-width:160px"><div class="select-trigger" style="height:32px;font-size:13px">SM · 32 ${icon("chevron-down", "width:16px;height:16px")}</div></div>
          <div class="select" style="max-width:160px"><div class="select-trigger">MD · 40 ${icon("chevron-down")}</div></div>
        </div>
      </div>
    </section>

    <section id="selection">
      <h2>Checkbox · Radio · Toggle</h2>
      <div class="demo">
        <div class="demo-row" style="gap: 32px">
          <label style="display:flex;align-items:center;gap:8px;font-size:14px"><span class="check checked">✓</span> Checked</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px"><span class="check">&nbsp;</span> Unchecked</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px"><span class="check checked">–</span> Indeterminate</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px"><span class="radio checked"></span> Radio on</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px"><span class="radio"></span> Radio off</label>
          <span class="toggle on"><span class="thumb"></span></span>
          <span class="toggle"><span class="thumb"></span></span>
        </div>
      </div>
    </section>

    <section id="badges">
      <h2>Badges · Chips</h2>
      <div class="demo">
        <div class="demo-label">Status badges — siempre par fg/bg + label</div>
        <div class="demo-row">
          <span class="badge badge-success">${icon("check-circle", "width:14px;height:14px")} Success</span>
          <span class="badge badge-error">${icon("x-circle", "width:14px;height:14px")} Error</span>
          <span class="badge badge-warning">${icon("exclamation-triangle", "width:14px;height:14px")} Warning</span>
          <span class="badge badge-alert">${icon("bell", "width:14px;height:14px")} Alert</span>
          <span class="badge badge-info">${icon("information-circle", "width:14px;height:14px")} Info</span>
        </div>
      </div>
      <div class="demo">
        <div class="demo-label">Filter chips</div>
        <div class="demo-row">
          <span class="chip chip-active">Últimos 30 días <span class="x">${icon("x-mark", "width:14px;height:14px")}</span></span>
          <span class="chip">Aprobadas</span>
          <span class="chip">Rechazadas</span>
          <span class="chip">${icon("funnel", "width:14px;height:14px")} Más filtros</span>
        </div>
      </div>
    </section>

    <section id="card">
      <h2>Card</h2>
      <div class="demo">
        <div class="ds-card">
          <div class="eyebrow">Transacción</div>
          <h4>Pago recibido</h4>
          <p>$1,234.56 MXN vía Terminal POS · hace 2 min.</p>
          <div class="demo-row">
            <button class="btn btn-primary btn-sm">Ver detalle</button>
            <button class="btn btn-ghost btn-sm">Descartar</button>
          </div>
        </div>
      </div>
    </section>

    <section id="table">
      <h2>Table</h2>
      <div class="demo" style="padding:0; overflow:hidden">
        <table class="ds">
          <thead><tr><th>Fecha</th><th>Comercio</th><th>Estado</th><th class="num">Monto</th></tr></thead>
          <tbody>
            <tr><td>10 ago 2026</td><td>Café Central</td><td><span class="badge badge-success">Aprobada</span></td><td class="num">$1,234.56</td></tr>
            <tr><td>09 ago 2026</td><td>Tienda MX</td><td><span class="badge badge-error">Rechazada</span></td><td class="num">$89.00</td></tr>
            <tr><td>08 ago 2026</td><td>Servicios VP</td><td><span class="badge badge-warning">Pendiente</span></td><td class="num">$12,500.00</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="tabs">
      <h2>Tabs</h2>
      <div class="demo">
        <div class="tabs">
          <span class="tab active">Resumen</span>
          <span class="tab">Movimientos</span>
          <span class="tab">Ajustes</span>
        </div>
      </div>
    </section>

    <section id="feedback">
      <h2>Alert · Toast · Tooltip</h2>
      <div class="demo">
        <div class="demo-label">Alert banners</div>
        <div class="alert alert-success">${icon("check-circle")}<div><strong>Listo</strong> — La transferencia se completó.</div></div>
        <div class="alert alert-error">${icon("x-circle")}<div><strong>Error</strong> — No se pudo procesar el pago.</div></div>
        <div class="alert alert-warning">${icon("exclamation-triangle")}<div><strong>Atención</strong> — Verifica los datos antes de continuar.</div></div>
        <div class="alert alert-info">${icon("information-circle")}<div><strong>Info</strong> — Tu corte de caja es a las 6pm.</div></div>
      </div>
      <div class="demo">
        <div class="demo-label">Toast + Tooltip</div>
        <div class="demo-row" style="align-items:flex-start">
          <div class="toast"><span style="color:var(--status-success)">${icon("check-circle")}</span><div><strong>Guardado</strong><br>Los cambios se aplicaron. <a href="#">Deshacer</a></div></div>
          <div class="tooltip">Este monto incluye comisión del 2.9%.</div>
        </div>
      </div>
    </section>

    <section id="modal">
      <h2>Modal</h2>
      <div class="demo" style="background: var(--bg-surface)">
        <div class="modal">
          <h4 style="margin:0 0 8px">¿Eliminar terminal?</h4>
          <p style="color:var(--text-secondary);font-size:14px;margin:0 0 24px">Esta acción no se puede deshacer.</p>
          <div class="demo-row" style="justify-content:flex-end">
            <button class="btn btn-ghost">Cancelar</button>
            <button class="btn btn-destructive">Eliminar</button>
          </div>
        </div>
      </div>
    </section>

    <section id="loading">
      <h2>Loading</h2>
      <div class="demo">
        <div class="demo-label">Skeleton — transaction row</div>
        <div class="demo-row">
          <div class="skeleton" style="width:36px;height:36px;border-radius:50%"></div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="skeleton" style="width:120px;height:14px"></div>
            <div class="skeleton" style="width:80px;height:12px"></div>
          </div>
          <div class="skeleton" style="width:64px;height:16px;margin-left:auto"></div>
        </div>
        <div style="margin-top:24px" class="demo-label">Spinner</div>
        <div class="spinner"></div>
      </div>
    </section>

    <div class="platform-hd" id="mobile">Componentes — Mobile <small>táctil · targets mínimo LG (44px) · sin XS/SM</small></div>

    <section>
      <div class="placeholder">
        <h3>🚧 Sección en preparación</h3>
        <p>Los componentes mobile aún no están definidos. Cuando me pases sus specs (o me digas
        cómo difieren de los web), los agrego aquí — cada uno con sus propias alturas, touch targets
        y densidad, sin mezclarlos con los de escritorio.</p>
        <p style="margin-bottom:0"><strong>Diferencias mobile que ya marca la documentación</strong> (según
        <code>Component Library.md</code> y las guías de Platforms):</p>
        <ul>
          <li>Todos los targets interactivos: <strong>mínimo 44px (LG)</strong> — Apple HIG / Material.</li>
          <li><strong>No usar XS (28px) ni SM (32px)</strong> — son solo desktop.</li>
          <li>Bottom tabs: máximo 5 items; contenido swipeable.</li>
          <li>Nav colapsa a hamburguesa en el breakpoint <code>md</code> (768px).</li>
          <li>Cada plataforma (mPOS · P5 · D60 · Assistant) tiene densidad e inputs propios — no comparten specs.</li>
        </ul>
      </div>
    </section>

    <div class="platform-hd" id="patterns">Patterns <small>composiciones · varios componentes ensamblados para una tarea</small></div>

    <section id="pat-upload">
      <h2>Modal — Subir documentos</h2>
      <p class="lead">Familia: Modales. Flujo de carga de archivos con dropzone y lista de estados
      (subiendo · listo · error).</p>
      <div class="recipe-stage">
        <div class="modal-lg">
          <div class="modal-head">
            <h4>Subir documentos</h4>
            <button class="icon-btn" aria-label="Cerrar">${icon("x-mark")}</button>
          </div>
          <div class="modal-body">
            <p style="margin:0;font-size:14px;color:var(--text-secondary)">Adjunta el comprobante de tu comercio. Formatos: PDF, JPG o PNG — máximo 10 MB por archivo.</p>
            <div class="dropzone">
              ${icon("cloud-arrow-up")}
              <div><strong>Arrastra tus archivos aquí</strong><br><span style="font-size:13px">o <a href="#">busca en tu equipo</a></span></div>
            </div>
            <div class="file-row">
              ${icon("document-text")}
              <div class="file-info"><span class="file-name">acta-constitutiva.pdf</span><span class="file-sub">2.4 MB · Listo</span></div>
              <span style="color:var(--status-success)">${icon("check-circle")}</span>
              <button class="icon-btn" aria-label="Eliminar">${icon("trash")}</button>
            </div>
            <div class="file-row">
              ${icon("document-text")}
              <div class="file-info"><span class="file-name">comprobante-domicilio.jpg</span><div class="progress"><i style="width:60%"></i></div><span class="file-sub">Subiendo… 60%</span></div>
              <button class="icon-btn" aria-label="Cancelar">${icon("x-mark")}</button>
            </div>
            <div class="file-row" style="border-color:var(--border-error)">
              ${icon("document-text")}
              <div class="file-info"><span class="file-name">ine-frente.png</span><span class="file-sub err">${icon("exclamation-circle", "width:13px;height:13px")} Excede 10 MB</span></div>
              <button class="icon-btn" aria-label="Quitar">${icon("trash")}</button>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost">Cancelar</button>
            <button class="btn btn-primary">${icon("arrow-up-tray")} Subir documentos</button>
          </div>
        </div>
      </div>
      <div class="recipe-meta">Compuesto de:
        <span class="part">Modal</span>
        <span class="part">Button (primary · ghost · icon-only)</span>
        <span class="part">File row</span>
        <span class="part">Progress</span>
        <span class="part">Status (success · error)</span>
        <span class="part">Iconos</span>
      </div>
      <p class="hint" style="margin-top:16px">Cada pieza usa tus tokens y componentes existentes — el patrón solo los ensambla. Nada aquí introduce colores ni medidas nuevas.</p>
    </section>

    <section id="status">
      <h2>Component Status</h2>
      <p class="lead">Leído de <code>Components/Component Status.md</code> — fuente única de "qué existe y qué falta".</p>
      <table class="status">
        <thead><tr><th>Componente</th><th>Figma</th><th>Doc</th><th>Estado</th><th>Nota</th></tr></thead>
        <tbody>
          ${statusRows.map((r) => `<tr><td>${esc(r.componente)}</td><td>${esc(r.figma)}</td><td>${esc(r.doc)}</td><td>${esc(statusEmoji(r.estado))}</td><td>${esc(r.nota)}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>

    <footer>
      Generado desde <code>Foundations/tokens/*.json</code> · Work Sans no está embebida (se usa system-ui como fallback si no la tienes instalada).
    </footer>
  </main>
</div>
</body>
</html>`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, html, "utf8");
console.log(`✓ Librería visual generada → _generated/preview.html (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`  ${primitiveColors.length} primitivos · ${semanticColors.length} semánticos · ${typeScale.length} estilos de texto · ${statusRows.length} componentes en matriz`);
