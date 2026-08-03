
/**
 * Valida contraste WCAG AA de los pares fg/bg de status (y algunos clave).
 * Falla (exit 1) si algún par de TEXTO no llega a 4.5:1. Este check habría cazado
 * el bug de status.error (#F04438) antes de llegar a los skills.
 */
import { readFile } from "node:fs/promises";

const hexToRgb = (h) => {
  const n = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = hexToRgb(hex).map(lin); return 0.2126*r + 0.7152*g + 0.0722*b; };
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

// resuelve un alias {color.red.fg} contra los primitivos
const prims = JSON.parse(await readFile("../foundations/tokens/color-primitives.json", "utf8"));
const sem   = JSON.parse(await readFile("../foundations/tokens/color-semantic.json", "utf8"));
function resolve(ref) {
  if (typeof ref !== "string") ref = ref.$value;
  if (!ref.startsWith("{")) return ref;
  const path = ref.slice(1, -1).split(".");
  let node = { color: prims.color, ...sem };
  for (const p of path) node = node[p];
  return resolve(node.$value ?? node);
}

const pairs = [
  ["status.success", "status.success-bg"],
  ["status.error",   "status.error-bg"],
  ["status.warning", "status.warning-bg"],
  ["status.alert",   "status.alert-bg"],
  ["status.info",    "status.info-bg"],
  ["text.primary",   "bg.card"],
  ["text.link",      "bg.card"],
  ["action.primary-text", "action.primary"],
];
const get = (dotted) => dotted.split(".").reduce((o, k) => o[k], sem);

let failed = false;
console.log("WCAG AA (texto ≥ 4.5:1)\n");
for (const [fgK, bgK] of pairs) {
  const fg = resolve(get(fgK)), bg = resolve(get(bgK));
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) failed = true;
  console.log(`${ok ? "✓" : "✗"} ${fgK} on ${bgK}  ${fg}/${bg}  ${r.toFixed(2)}:1`);
}
if (failed) { console.error("\n✗ Contraste AA falló. Bloquea el merge."); process.exit(1); }
console.log("\n✓ Todos los pares pasan AA.");
