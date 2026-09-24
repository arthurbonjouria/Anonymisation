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

    // Choisi automatiquement par le site à l'ouverture ("ai" si un Ollama
    // local répond, "regex" sinon) — voir app/page.tsx et
    // /api/ollama-status. Si "ai" est demandé mais qu'Ollama ne répond plus
    // (coupé entre-temps), lib/ollama-detect.ts renvoie simplement aucune
    // détection plutôt que d'échouer ; mieux vaut le signaler que de
    // basculer silencieusement vers les regex que l'utilisateur ne veut
    // justement plus.
    const modeParam = formData.get("mode");
    const mode = modeParam === "ai" ? "ai" : "regex";

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const pdfjsDoc = await loadPdfDocument(bytes);
    const pageCount = pdfjsDoc.numPages as number;

    const pages: PageInfo[] = [];
    // Étape 1 : extraction/rendu/OCR de chaque page, SÉQUENTIELLEMENT (ça
    // partage le même document pdfjs et le même canvas natif — ce n'est de
    // toute façon pas le goulot d'étranglement, contrairement à l'appel IA).
    const pageContexts: { index: number; text: string; items: PositionedTextItem[] }[] = [];

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

      pageContexts.push({ index, text, items });
      pages.push({
        index,
        width: rendered.width / PREVIEW_SCALE,
        height: rendered.height / PREVIEW_SCALE,
        imageDataUrl: canvasToPngDataUrl(rendered.canvas),
        isScanned,
      });
    }

    // Étape 2 : détection PII, page par page, SÉQUENTIELLEMENT.
    //
    // Tentative précédente : lancer tous les appels IA en parallèle
    // (Promise.all) pour aller plus vite. Résultat en test réel sur un
    // document de 7 pages : SEULE la première page à répondre obtenait un
    // résultat, toutes les autres revenaient bredouilles. Cause : Ollama, sur
    // une machine grand public, ne traite qu'UNE requête `generate` à la
    // fois (un seul modèle chargé en mémoire) — envoyer 7 requêtes en même
    // temps les mettait en file d'attente côté Ollama, et le timeout de
    // CHAQUE requête (démarré côté client dès l'envoi, pas quand Ollama
    // commence réellement à la traiter) expirait avant que son tour
    // n'arrive. Silence radio sur la quasi-totalité du document — bien pire
    // que la lenteur du séquentiel.
    const detections: Detection[] = [];
    for (const ctx of pageContexts) {
      const pageDetections = await detectPiiOnPage(ctx.index, ctx.text, ctx.items, mode);
      detections.push(...pageDetections);
    }

    // Pas de session, pas de stockage : le fichier original n'est jamais
    // conservé côté serveur au-delà de cette requête. Le navigateur renvoie
    // lui-même le fichier à /api/anonymize avec les zones choisies — voir
    // app/api/anonymize/route.ts.
    const response: UploadResponse = {
      fileName: file.name,
      pages,
      detections,
      mode,
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
