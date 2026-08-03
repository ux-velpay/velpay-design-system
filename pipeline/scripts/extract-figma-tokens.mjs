
/**
 * Extrae tokens desde Figma hacia foundations/tokens/*.json.
 *
 * MODO REST (Enterprise, Full seat):
 *   FIGMA_TOKEN=...  FIGMA_FILE_KEY=qMPFDSFD1AWgESKaCtvMcm  MODE=rest  node extract-figma-tokens.mjs
 *   Usa GET /v1/files/:key/variables/local (scope file_variables:read).
 *
 * MODO TOKENS-STUDIO (plan no-Enterprise):
 *   El plugin Tokens Studio ya sincroniza el JSON al repo. No hay extracción por API;
 *   este script solo valida que los archivos existan y estén bien formados.
 *   MODE=tokens-studio node extract-figma-tokens.mjs
 *
 * NOTA: el mapeo variable->token depende de los nombres de tus colecciones en Figma.
 * El bloque `mapVariablesToTokens` es un TODO a completar con tu estructura real.
 */
import { writeFile } from "node:fs/promises";

const MODE = process.env.MODE ?? "tokens-studio";

async function fetchFigmaVariables() {
  const key = process.env.FIGMA_FILE_KEY;
  const token = process.env.FIGMA_TOKEN;
  if (!key || !token) throw new Error("Faltan FIGMA_FILE_KEY / FIGMA_TOKEN");
  const res = await fetch(
    `https://api.figma.com/v1/files/${key}/variables/local`,
    { headers: { "X-Figma-Token": token } }
  );
  if (res.status === 403)
    throw new Error("403: la Variables REST API requiere Enterprise + Full seat. Usa MODE=tokens-studio.");
  if (!res.ok) throw new Error(`Figma API ${res.status}`);
  return res.json();
}

function mapVariablesToTokens(_figmaPayload) {
  // TODO: mapear collections/modes de Figma a la estructura DTCG de foundations/tokens/*.json.
  // Debe respetar la cadena primitivo -> semántico (alias {color.purple.500}, etc.).
  throw new Error("mapVariablesToTokens: completar con los nombres de tus colecciones de Figma.");
}

async function main() {
  if (MODE === "rest") {
    const payload = await fetchFigmaVariables();
    const tokens = mapVariablesToTokens(payload);
    for (const [file, obj] of Object.entries(tokens)) {
      await writeFile(`../foundations/tokens/${file}`, JSON.stringify(obj, null, 2) + "\n");
    }
    console.log("✓ tokens extraídos vía REST API");
  } else {
    console.log("MODE=tokens-studio: se asume que el plugin ya commiteó los JSON. Nada que extraer.");
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
