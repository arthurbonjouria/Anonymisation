/**
 * Construction du PDF anonymisé.
 *
 * Pour chaque page contenant au moins une zone confirmée par l'utilisateur :
 *   1. on rend la page en image haute résolution (pdfjs + canvas),
 *   2. on dessine un rectangle opaque par-dessus chaque zone à masquer,
 *   3. on remplace ENTIÈREMENT la page par cette image dans le PDF final.
 *
 * Remplacer la page par une image (plutôt que de simplement dessiner un
 * rectangle par-dessus le PDF vectoriel d'origine) est indispensable pour une
 * anonymisation réelle : le texte vectoriel sous-jacent est ainsi
 * définitivement supprimé du fichier, et ne peut plus être récupéré par un
 * copier-coller ou une extraction de texte, même si le rectangle est retiré.
 *
 * Les pages sans zone détectée/confirmée sont copiées telles quelles depuis
 * le PDF d'origine (texte vectoriel préservé, pas de perte de qualité).
 */

import { PDFDocument } from "pdf-lib";
import {
  loadPdfDocument,
  renderPageToCanvas,
  canvasToPngBuffer,
} from "./pdf-render";
import type { AnonymizeZone } from "./types";
import { createCanvas } from "@napi-rs/canvas";

/** Résolution de rasterisation des pages anonymisées (en multiple de 72 DPI). */
const REDACT_SCALE = 2.5; // ~180 DPI, bon compromis lisibilité / poids fichier

export async function buildAnonymizedPdf(
  originalBytes: Uint8Array,
  zones: AnonymizeZone[]
): Promise<Uint8Array> {
  const zonesByPage = new Map<number, AnonymizeZone[]>();
  for (const zone of zones) {
    const list = zonesByPage.get(zone.page) ?? [];
    list.push(zone);
    zonesByPage.set(zone.page, list);
  }

  const pdfjsDoc = await loadPdfDocument(originalBytes);
  const srcDoc = await PDFDocument.load(originalBytes);
  const outDoc = await PDFDocument.create();

  const pageCount = srcDoc.getPageCount();

  for (let index = 0; index < pageCount; index++) {
    const pageZones = zonesByPage.get(index);

    if (!pageZones || pageZones.length === 0) {
      const [copied] = await outDoc.copyPages(srcDoc, [index]);
      outDoc.addPage(copied);
      continue;
    }

    const rendered = await renderPageToCanvas(pdfjsDoc, index, REDACT_SCALE);
    const ctx = rendered.canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    for (const zone of pageZones) {
      const x = zone.box.x * rendered.width;
      const y = zone.box.y * rendered.height;
      const w = zone.box.width * rendered.width;
      const h = zone.box.height * rendered.height;
      ctx.fillRect(x, y, w, h);
    }

    const pngBuffer = canvasToPngBuffer(rendered.canvas);
    const image = await outDoc.embedPng(pngBuffer);

    const srcPage = srcDoc.getPage(index);
    const { width: pageWidthPt, height: pageHeightPt } = srcPage.getSize();

    const newPage = outDoc.addPage([pageWidthPt, pageHeightPt]);
    newPage.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    });
  }

  return outDoc.save();
}

// Ré-exporté pour les tests / usages avancés (ex: prévisualiser le rendu
// d'une zone masquée avant anonymisation complète).
export { createCanvas };
