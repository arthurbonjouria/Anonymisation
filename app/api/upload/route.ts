import { NextResponse } from "next/server";
import {
  loadPdfDocument,
  renderPageToCanvas,
  canvasToPngDataUrl,
} from "@/lib/pdf-render";
import { extractNativeTextForPage } from "@/lib/pdf-extract";
import { ocrCanvas } from "@/lib/ocr";
import { detectPiiOnPage, buildPageText } from "@/lib/pii-detect";
import type { PositionedTextItem } from "@/lib/pii-detect";
import type { Detection, PageInfo, UploadResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// Seuil en-dessous duquel une page est considérée comme scannée (peu/pas de
// texte vectoriel) et déclenche l'OCR.
const SCANNED_PAGE_CHAR_THRESHOLD = 20;
const PREVIEW_SCALE = 1.5;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier PDF reçu." },
        { status: 400 }
      );
    }
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Le fichier doit être un PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const pdfjsDoc = await loadPdfDocument(bytes);
    const pageCount = pdfjsDoc.numPages as number;

    const pages: PageInfo[] = [];
    const detections: Detection[] = [];

    for (let index = 0; index < pageCount; index++) {
      const native = await extractNativeTextForPage(pdfjsDoc, index);
      const isScanned = native.significantCharCount < SCANNED_PAGE_CHAR_THRESHOLD;

      const rendered = await renderPageToCanvas(pdfjsDoc, index, PREVIEW_SCALE);

      let items: PositionedTextItem[] = native.items;
      let text = native.text;

      if (isScanned) {
        const ocrResult = await ocrCanvas(rendered.canvas);
        items = ocrResult.items;
        text = buildPageText(items);
      }

      const pageDetections = detectPiiOnPage(index, text, items);
      detections.push(...pageDetections);

      pages.push({
        index,
        width: rendered.width / PREVIEW_SCALE,
        height: rendered.height / PREVIEW_SCALE,
        imageDataUrl: canvasToPngDataUrl(rendered.canvas),
        isScanned,
      });
    }

    // Pas de session, pas de stockage : le fichier original n'est jamais
    // conservé côté serveur au-delà de cette requête. Le navigateur renvoie
    // lui-même le fichier à /api/anonymize avec les zones choisies — voir
    // app/api/anonymize/route.ts.
    const response: UploadResponse = {
      fileName: file.name,
      pages,
      detections,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Erreur /api/upload:", err);
    return NextResponse.json(
      { error: "Impossible d'analyser ce PDF." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "Utilisez POST avec un fichier PDF." },
    { status: 405 }
  );
}
