/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfjs-dist / @napi-rs/canvas / tesseract.js do their own thing with native
  // bindings and worker files; keep them out of the server bundle so Node
  // resolves them at runtime instead of webpack trying to bundle them.
  experimental: {
    serverComponentsExternalPackages: [
      "pdfjs-dist",
      "@napi-rs/canvas",
      "tesseract.js",
      "tesseract.js-core",
    ],
    // Sur Vercel (et toute plateforme serverless basée sur @vercel/nft), seuls
    // les fichiers explicitement `require`/`import`-és sont inclus dans le
    // paquet de la fonction déployée. `lib/pdf-render.ts` lit les polices
    // standard, les cmaps et le worker de pdfjs-dist via un chemin construit
    // dynamiquement (fs.readFile / import() avec un chemin calculé), donc le
    // traceur ne les détecte pas tout seul.
    //
    // Ce bloc `outputFileTracingIncludes` est la méthode officiellement
    // documentée par Next.js pour ce cas — gardée par précaution — mais en
    // pratique elle n'a PAS suffi sur Vercel (constaté en déploiement réel :
    // "Setting up fake worker failed: Cannot find module '.../pdf.worker.mjs'"
    // malgré ce bloc). Le correctif qui fonctionne réellement est
    // `lib/pdfjs-asset-trace-hints.ts` + l'import factice dans
    // `lib/pdf-render.ts` : des références statiques (`require.resolve(...)`,
    // `import(...)`) que @vercel/nft sait suivre, contrairement à un chemin
    // recalculé avec `process.cwd()` à l'exécution.
    outputFileTracingIncludes: {
      "/app/api/upload": [
        "./node_modules/pdfjs-dist/standard_fonts/**",
        "./node_modules/pdfjs-dist/cmaps/**",
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      ],
      "/app/api/anonymize": [
        "./node_modules/pdfjs-dist/standard_fonts/**",
        "./node_modules/pdfjs-dist/cmaps/**",
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      ],
    },
  },
};

module.exports = nextConfig;
