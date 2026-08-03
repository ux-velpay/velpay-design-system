
// Style Dictionary v4 — build tokens/*.json -> CSS custom properties.
// Docs: https://styledictionary.com
export default {
  source: ["../foundations/tokens/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "dist/",
      files: [{
        destination: "tokens.css",
        format: "css/variables",
        options: { outputReferences: true } // preserva var(--...) en aliases
      }]
    },
    // ejemplo extra: Tailwind / JS. Descomentar si se necesita.
    // js: { transformGroup: "js", buildPath: "dist/", files: [
    //   { destination: "tokens.js", format: "javascript/es6" }
    // ]}
  }
};
