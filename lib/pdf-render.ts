/**
 * Rendu de pages PDF en image raster (PNG), côté serveur.
 *
 * pdfjs-dist détecte automatiquement l'environnement Node et utilise en
 * interne `@napi-rs/canvas` pour tout ce dont il a besoin en dehors du canvas
 * principal (masques, patterns...) — il ne faut donc PAS lui fournir de
 * `CanvasFactory` personnalisée : cela court-circuite ce mécanisme interne et
 * provoque des erreurs (`DataCloneError`) lors du rendu. On se contente de
 * créer nous-mêmes le canvas principal avec `@napi-rs/canvas` et de le passer
 * à `page.render()` via `canvasContext`.
 *
 * Utilisé pour : l'aperçu envoyé au frontend, l'OCR des PDF scannés, et la
 * rasterisation finale des pages contenant des zones anonymisées.
 */

import { Canvas, createCanvas } from "@napi-rs/canvas";
import path from "path";
// @ts-ignore - pas de types officiels pour le build legacy Node
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export interface RenderedPage {
  canvas: Canvas;
  width: number;
  height: number;
  scale: number;
}

// pdfjs a besoin des données des polices "standard" (Helvetica, Times...) et
// des cmaps pour convertir chaque caractère en tracé vectoriel avant de le
// dessiner sur le canvas. Sans ces fichiers (fournis avec le package), la
// génération du tracé échoue silencieusement ("getPathGenerator - ignoring
// character") et le texte n'apparaît pas du tout dans le rendu, même si
// l'extraction de texte (getTextContent) fonctionne normalement. Ces
// fichiers sont lus depuis le disque local (node_modules) : aucun accès
// réseau n'est effectué.
//
// On construit le chemin à partir de `process.cwd()` plutôt que
// `require.resolve()` : dans le bundle serveur de Next.js, `require.resolve`
// renvoie un identifiant interne à webpack (ex: "(rsc)/./node_modules/...")
// et non un vrai chemin disque.
const PDFJS_ROOT = path.join(process.cwd(), "node_modules", "pdfjs-dist");
const STANDARD_FONT_DATA_URL = path.join(PDFJS_ROOT, "standard_fonts") + path.sep;
const CMAP_URL = path.join(PDFJS_ROOT, "cmaps") + path.sep;

export async function loadPdfDocument(bytes: Uint8Array) {
  const loadingTask = pdfjsLib.getDocument({
    // pdfjs "transfère" (détache) l'ArrayBuffer sous-jacent des données
    // fournies (comme s'il l'envoyait à un worker). On passe donc toujours
    // une COPIE : le buffer d'origine (ex: stocké en session pour être
    // réutilisé plus tard) ne doit jamais être détaché.
    data: bytes.slice(),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    // Ces chemins pointent vers node_modules en local : aucune requête
    // réseau n'est jamais effectuée pour charger les polices/cmaps.
    isEvalSupported: false,
  } as any);
  return loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfDoc: any,
  pageIndex: number,
  scale: number
): Promise<RenderedPage> {
  const page = await pdfDoc.getPage(pageIndex + 1); // pdfjs = 1-indexed
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return { canvas, width: canvas.width, height: canvas.height, scale };
}

export function canvasToPngDataUrl(canvas: Canvas): string {
  const buffer = canvas.toBuffer("image/png");
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function canvasToPngBuffer(canvas: Canvas): Buffer {
  return canvas.toBuffer("image/png");
}
