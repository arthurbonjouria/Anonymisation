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
    // standard et les cmaps de pdfjs-dist via un chemin de fichier construit
    // dynamiquement (fs.readFile), donc le traceur ne les détecte pas tout
    // seul : sans cette entrée, ces fichiers seraient absents une fois
    // déployé et le rendu des PDF échouerait silencieusement.
    // `pdf.worker.mjs` doit aussi être inclus explicitement : pdfjs essaie de
    // le charger dynamiquement (son "fake worker" en Node a besoin du même
    // fichier que le vrai worker), sans jamais faire de `require`/`import`
    // statique dessus — le traceur ne le voit donc pas non plus tout seul.
    // Sans ça : "Setting up fake worker failed: Cannot find module
    // '.../pdf.worker.mjs'" une fois déployé, alors que ça fonctionne en
    // local où tout `node_modules` est présent sur disque.
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
