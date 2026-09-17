/**
 * OCR des pages scannées (sans texte vectoriel) via tesseract.js.
 *
 * L'image de la page ne quitte jamais le serveur : tesseract.js tourne dans
 * le process Node local. Seul le modèle de langue ("fra.traineddata") est
 * téléchargé au premier lancement (voir README pour l'utiliser hors-ligne en
 * pré-téléchargeant le fichier .traineddata).
 */

import { createWorker } from "tesseract.js";
import type { Canvas } from "@napi-rs/canvas";
import type { PositionedTextItem } from "./pii-detect";
import { canvasToPngBuffer } from "./pdf-render";

export interface OcrPageExtraction {
  text: string;
  items: PositionedTextItem[];
}

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("fra+eng");
  }
  return workerPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

/**
 * OCRise une page déjà rendue en image (canvas), et renvoie le texte + les
 * boîtes englobantes de chaque mot, normalisées 0..1 par rapport à l'image
 * (donc directement compatibles avec les items d'extraction native puisque
 * l'image couvre exactement la page).
 */
export async function ocrCanvas(canvas: Canvas): Promise<OcrPageExtraction> {
  const worker = await getWorker();
  const buffer = canvasToPngBuffer(canvas);
  const { data } = await worker.recognize(buffer);

  const items: PositionedTextItem[] = [];
  let text = "";
  let cursor = 0;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const words = (data as any).words as
    | Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>
    | undefined;

  if (words && words.length > 0) {
    for (const word of words) {
      const str = word.text + " ";
      if (word.text.trim().length === 0) {
        text += str;
        cursor += str.length;
        continue;
      }
      const box = {
        x: word.bbox.x0 / imgWidth,
        y: word.bbox.y0 / imgHeight,
        width: (word.bbox.x1 - word.bbox.x0) / imgWidth,
        height: (word.bbox.y1 - word.bbox.y0) / imgHeight,
      };
      items.push({
        text: str,
        start: cursor,
        end: cursor + str.length,
        box,
        source: "ocr",
      });
      text += str;
      cursor += str.length;
    }
  } else {
    // Fallback si le worker ne renvoie pas les positions de mots.
    text = data.text || "";
  }

  return { text, items };
}
