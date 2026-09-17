// @ts-nocheck -- fichier généré : références de fichiers non-JS, non typables.
/**
 * Fichier GÉNÉRÉ (voir scripts/generate-pdfjs-asset-hints.js) : ne
 * référence jamais de code exécuté au runtime. Son seul but est de forcer
 * l'outil de traçage de fichiers de Vercel (@vercel/nft) à inclure les
 * polices standard et les cmaps de pdfjs-dist dans le paquet de la
 * fonction déployée : sans ça, ces fichiers (lus dynamiquement via un
 * chemin construit avec process.cwd(), donc invisible pour l'analyse
 * statique) seraient absents une fois en ligne et le rendu des PDF
 * échouerait silencieusement (texte invisible).
 *
 * Voir lib/pdf-render.ts pour le même mécanisme appliqué à pdf.worker.mjs.
 * Régénérer avec: node scripts/generate-pdfjs-asset-hints.js
 */

export function pdfjsAssetTraceHints(): void {
  if (process.env.__FORCE_PDFJS_WORKER_TRACE__ !== "impossible") return;
  // webpackIgnore: ce ne sont pas des modules JS (fichiers binaires .pfb/
  // .bcmap) — le commentaire magique empêche webpack d'essayer de les
  // analyser/bundler pendant SON PROPRE build (ce qui ferait échouer le
  // build). @vercel/nft, qui scanne le JS déjà compilé après coup, voit
  // quand même la chaîne littérale et inclut le fichier correspondant.
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitDingbats.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitFixed.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitFixedBold.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitFixedBoldItalic.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitFixedItalic.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitSerif.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitSerifBold.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitSerifBoldItalic.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitSerifItalic.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/FoxitSymbol.pfb");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/LiberationSans-BoldItalic.ttf");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/LiberationSans-Italic.ttf");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/LICENSE_FOXIT");
  void import(/* webpackIgnore: true */ "pdfjs-dist/standard_fonts/LICENSE_LIBERATION");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78ms-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/78ms-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/83pv-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/90ms-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/90ms-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/90msp-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/90msp-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/90pv-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/90pv-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Add-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Add-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Add-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Add-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-0.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-1.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-3.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-4.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-5.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-6.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-CNS1-UCS2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-0.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-1.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-3.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-4.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-5.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-GB1-UCS2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-0.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-1.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-3.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-4.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-5.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-6.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Japan1-UCS2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Korea1-0.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Korea1-1.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Korea1-2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Adobe-Korea1-UCS2.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/B5pc-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/B5pc-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/CNS-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/CNS-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/CNS1-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/CNS1-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/CNS2-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/CNS2-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/ETen-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/ETen-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/ETenms-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/ETenms-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/ETHK-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/ETHK-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Ext-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Ext-RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Ext-RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Ext-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GB-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GB-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GB-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GB-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBK-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBK-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBK2K-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBK2K-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBKp-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBKp-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBpc-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBpc-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBT-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBT-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBT-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBT-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBTpc-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/GBTpc-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Hankaku.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Hiragana.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKdla-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKdla-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKdlb-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKdlb-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKgccs-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKgccs-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKm314-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKm314-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKm471-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKm471-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKscs-B5-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/HKscs-B5-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Katakana.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSC-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSC-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSC-Johab-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSC-Johab-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSCms-UHC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSCms-UHC-HW-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSCms-UHC-HW-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSCms-UHC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSCpc-EUC-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/KSCpc-EUC-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/LICENSE");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/NWP-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/NWP-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/RKSJ-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/RKSJ-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/Roman.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UCS2-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UCS2-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UTF16-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UTF16-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UTF8-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniCNS-UTF8-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UCS2-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UCS2-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UTF16-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UTF16-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UTF8-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniGB-UTF8-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UCS2-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UCS2-HW-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UCS2-HW-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UCS2-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UTF16-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UTF16-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UTF8-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS-UTF8-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS2004-UTF16-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS2004-UTF16-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS2004-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS2004-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS2004-UTF8-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJIS2004-UTF8-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISPro-UCS2-HW-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISPro-UCS2-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISPro-UTF8-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISX0213-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISX0213-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISX02132004-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniJISX02132004-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UCS2-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UCS2-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UTF16-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UTF16-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UTF32-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UTF32-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UTF8-H.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/UniKS-UTF8-V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/V.bcmap");
  void import(/* webpackIgnore: true */ "pdfjs-dist/cmaps/WP-Symbol.bcmap");
}
