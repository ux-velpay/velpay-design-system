
/**
 * Regenera las tablas de tokens dentro de foundations/design-tokens.md entre marcadores
 * <!-- AUTO:color:start --> ... <!-- AUTO:color:end -->. Así el .md deja de mantenerse a mano.
 * (Versión mínima: regenera la tabla de status. Extender a spacing/type según se necesite.)
 */
import { readFile, writeFile } from "node:fs/promises";

const prims = JSON.parse(await readFile("../foundations/tokens/color-primitives.json", "utf8")).color;
const rows = [["success","green"],["error","red"],["warning","yellow"],["alert","orange"]]
  .map(([name, prim]) => `| ${name} | \`${prims[prim].fg.$value}\` | \`${prims[prim].bg.$value}\` |`)
  .join("\n");
const table = `| status | fg | bg |\n|---|---|---|\n${rows}`;
const block = `<!-- AUTO:status:start -->\n${table}\n<!-- AUTO:status:end -->`;

const path = "../foundations/design-tokens.md";
let md = await readFile(path, "utf8");
const re = /<!-- AUTO:status:start -->[\s\S]*?<!-- AUTO:status:end -->/;
md = re.test(md) ? md.replace(re, block) : md + "\n\n## Status (generado)\n" + block + "\n";
await writeFile(path, md);
console.log("✓ design-tokens.md regenerado (tabla status).");
