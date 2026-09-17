/**
 * Extraction du texte natif d'une page PDF (texte vectoriel, pas d'image),
 * avec la boîte englobante de chaque item, normalisée en coordonnées 0..1
 * (origine en haut à gauche) pour être directement exploitable côté UI.
 */

import type { PositionedTextItem } from "./pii-detect";

export interface NativePageExtraction {
  text: string;
  items: PositionedTextItem[];
  /** Nombre de caractères "significatifs" (hors espaces) - sert à détecter
   * les pages scannées (texte quasi absent). */
  significantCharCount: number;
}

export async function extractNativeTextForPage(
  pdfDoc: any,
  pageIndex: number
): Promise<NativePageExtraction> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 1 });
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  const textContent = await page.getTextContent();
  const items: PositionedTextItem[] = [];
  let cursor = 0;
  let text = "";

  for (const raw of textContent.items as any[]) {
    if (typeof raw.str !== "string") continue;
    const str: string = raw.hasEOL ? raw.str + "\n" : raw.str + " ";
    if (raw.str.length === 0) {
      text += str;
      cursor += str.length;
      continue;
    }

    // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const [, , , scaleY, tx, ty] = raw.transform as number[];
    const fontHeight = Math.hypot(raw.transform[2], raw.transform[3]) || Math.abs(scaleY) || 10;
    const itemWidth = raw.width || 1;
    const itemHeight = raw.height || fontHeight;

    // Coordonnées PDF (origine bas-gauche) -> on convertit en haut-gauche,
    // puis on normalise par les dimensions de la page.
    const xPdf = tx;
    const yTopPdf = pageHeight - ty - itemHeight * 0.8; // approx ascendant/descendant
    const box = {
      x: Math.max(0, xPdf / pageWidth),
      y: Math.max(0, yTopPdf / pageHeight),
      width: Math.min(1, itemWidth / pageWidth),
      height: Math.min(1, itemHeight / pageHeight),
    };

    items.push({
      text: str,
      start: cursor,
      end: cursor + str.length,
      box,
      source: "native",
    });
    text += str;
    cursor += str.length;
  }

  const significantCharCount = text.replace(/\s+/g, "").length;

  return { text, items, significantCharCount };
}
