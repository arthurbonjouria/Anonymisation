const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "node_modules", "pdfjs-dist");
const fonts = fs.readdirSync(path.join(root, "standard_fonts"));
const cmaps = fs.readdirSync(path.join(root, "cmaps"));

const lines = [];
lines.push("// @ts-nocheck -- fichier généré : références de fichiers non-JS, non typables.");
lines.push("/**");
lines.push(" * Fichier GÉNÉRÉ (voir scripts/generate-pdfjs-asset-hints.js) : ne");
lines.push(" * référence jamais de code exécuté au runtime. Son seul but est de forcer");
lines.push(" * l'outil de traçage de fichiers de Vercel (@vercel/nft) à inclure les");
lines.push(" * polices standard et les cmaps de pdfjs-dist dans le paquet de la");
lines.push(" * fonction déployée : sans ça, ces fichiers (lus dynamiquement via un");
lines.push(" * chemin construit avec process.cwd(), donc invisible pour l'analyse");
lines.push(" * statique) seraient absents une fois en ligne et le rendu des PDF");
lines.push(" * échouerait silencieusement (texte invisible).");
lines.push(" *");
lines.push(" * Voir lib/pdf-render.ts pour le même mécanisme appliqué à pdf.worker.mjs.");
lines.push(" * Régénérer avec: node scripts/generate-pdfjs-asset-hints.js");
lines.push(" */");
lines.push("");
lines.push('export function pdfjsAssetTraceHints(): void {');
lines.push('  if (process.env.__FORCE_PDFJS_WORKER_TRACE__ !== "impossible") return;');
lines.push("  // webpackIgnore: ce ne sont pas des modules JS (fichiers binaires .pfb/");
lines.push("  // .bcmap) — le commentaire magique empêche webpack d'essayer de les");
lines.push("  // analyser/bundler pendant SON PROPRE build (ce qui ferait échouer le");
lines.push("  // build). @vercel/nft, qui scanne le JS déjà compilé après coup, voit");
lines.push("  // quand même la chaîne littérale et inclut le fichier correspondant.");
for (const f of fonts) {
  lines.push(`  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/${f}");`);
}
for (const c of cmaps) {
  lines.push(`  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/${c}");`);
}
lines.push("}");
lines.push("");

const outPath = path.join(__dirname, "..", "lib", "pdfjs-asset-trace-hints.ts");
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${outPath} (${fonts.length} fonts + ${cmaps.length} cmaps)`);
