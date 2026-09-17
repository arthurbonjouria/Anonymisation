/**
 * Applique les patterns PII (lib/pii-patterns.ts) + la détection de noms
 * (lib/name-detect.ts) sur le texte d'une page, et projette les résultats sur
 * les boîtes englobantes des mots/segments d'origine (extraction native ou
 * OCR) pour produire des `Detection` positionnées sur la page.
 */

import { v4 as uuidv4 } from "uuid";
import { createCanvas } from "@napi-rs/canvas";
import { PII_PATTERNS } from "./pii-patterns";
import { detectNames } from "./name-detect";
import type { Detection, NormalizedBox, PiiType } from "./types";

/** Un segment de texte positionné sur la page (mot ou run de texte), avec ses
 * offsets dans le texte concaténé de la page. */
export interface PositionedTextItem {
  text: string;
  start: number;
  end: number;
  box: NormalizedBox; // déjà normalisé 0..1, origin top-left
  source: "native" | "ocr";
}

interface RawMatch {
  type: PiiType;
  text: string;
  start: number;
  end: number;
  confidence: number;
  source: "regex" | "nlp";
}

function runRegexPatterns(text: string): RawMatch[] {
  const matches: RawMatch[] = [];
  for (const pattern of PII_PATTERNS) {
    // Chaque regex est déclarée avec le flag `g` et partage un état
    // `lastIndex` : on la clone pour éviter les effets de bord entre pages.
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    for (const m of text.matchAll(regex)) {
      const matchedText = m[0];
      // Important : une clé de contrôle invalide (ex: IBAN/NIR avec une
      // faute de frappe, ou volontairement fictif comme dans un document de
      // test) ne veut PAS dire que ce n'est pas une donnée sensible à
      // masquer — seulement que la confiance est un peu plus faible. Un
      // outil d'anonymisation doit ignorer ce cas par excès de prudence,
      // pas l'exclure purement et simplement : le rejeter reviendrait à
      // laisser passer un vrai IBAN/NIR simplement mal saisi.
      const isValid = pattern.validate ? pattern.validate(matchedText) : true;
      matches.push({
        type: pattern.type,
        text: matchedText,
        start: m.index ?? 0,
        end: (m.index ?? 0) + matchedText.length,
        confidence: isValid ? pattern.confidence : pattern.confidence * 0.85,
        source: "regex",
      });
    }
  }
  return matches;
}

function runNameDetection(text: string): RawMatch[] {
  return detectNames(text).map((n) => ({
    type: "name" as PiiType,
    text: n.text,
    start: n.start,
    end: n.end,
    confidence: n.confidence,
    source: "nlp" as const,
  }));
}

/** Supprime les matches strictement contenus dans un match plus large de
 * priorité égale ou supérieure (ex: un code postal déjà capturé par une
 * adresse complète). */
function dedupeNested(matches: RawMatch[]): RawMatch[] {
  const sorted = [...matches].sort(
    (a, b) => a.start - b.start || b.end - b.end
  );
  const kept: RawMatch[] = [];
  for (const m of sorted) {
    const containedIn = kept.find(
      (k) => m.start >= k.start && m.end <= k.end && !(m.start === k.start && m.end === k.end)
    );
    if (containedIn) continue;
    kept.push(m);
  }
  return kept;
}

/** Union de deux boîtes normalisées. */
function unionBox(a: NormalizedBox, b: NormalizedBox): NormalizedBox {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

// Canvas hors-écran réutilisé uniquement pour `measureText` : on ne dessine
// jamais rien dedans, on l'utilise comme "règle" pour mesurer des largeurs de
// texte. Une taille de police fixe suffit : on n'a besoin que des largeurs
// RELATIVES entre le préfixe, la portion à masquer et le suffixe d'un item,
// qui sont (quasiment) invariantes par mise à l'échelle de la police.
const MEASURE_FONT_SIZE = 100;
const measureCanvas = createCanvas(10, 10);
const measureCtx = measureCanvas.getContext("2d");
measureCtx.font = `${MEASURE_FONT_SIZE}px sans-serif`;
// Largeur d'un caractère "large" typique, utilisée comme marge de sécurité
// (en unités de mesure) de chaque côté de la portion masquée.
const SAFETY_MARGIN = measureCtx.measureText("M").width * 0.5;

function measureText(text: string): number {
  if (!text) return 0;
  return measureCtx.measureText(text).width;
}

/**
 * Calcule la portion de la boîte d'un item de texte qui correspond
 * réellement au chevauchement avec [start,end), en mesurant les largeurs du
 * préfixe / de la portion à masquer / du suffixe avec un moteur de rendu de
 * texte (canvas), plutôt qu'en supposant une largeur de caractère uniforme.
 * Les polices réelles sont à chasse variable (un "i" est bien plus étroit
 * qu'un "M") : une simple division par le nombre de caractères produisait
 * des boîtes trop courtes ou trop longues selon le texte, laissant parfois
 * dépasser un bout de la donnée à masquer.
 *
 * Sans ce découpage proportionnel du tout, un item pdfjs peut représenter
 * une ligne entière, voire un paragraphe entier (selon la façon dont le PDF
 * source a été généré) : toute la ligne/le paragraphe serait alors noirci
 * dès qu'une seule donnée personnelle y est détectée.
 */
function subBoxForOverlap(
  item: PositionedTextItem,
  start: number,
  end: number
): NormalizedBox {
  const itemLen = item.end - item.start;
  if (itemLen <= 0) return item.box;

  const overlapStart = Math.max(start, item.start) - item.start;
  const overlapEnd = Math.min(end, item.end) - item.start;

  const fullWidth = measureText(item.text);
  if (fullWidth <= 0) {
    // Filet de sécurité si la mesure échoue (item vide, police non
    // supportée...) : on retombe sur la boîte entière plutôt que de risquer
    // une boîte mal placée ou de largeur nulle.
    return item.box;
  }

  const prefixWidth = measureText(item.text.slice(0, overlapStart));
  const matchWidth = measureText(item.text.slice(overlapStart, overlapEnd));

  const startUnits = Math.max(0, prefixWidth - SAFETY_MARGIN);
  const endUnits = Math.min(fullWidth, prefixWidth + matchWidth + SAFETY_MARGIN);

  const fracStart = startUnits / fullWidth;
  const fracEnd = endUnits / fullWidth;

  return {
    x: item.box.x + fracStart * item.box.width,
    y: item.box.y,
    width: (fracEnd - fracStart) * item.box.width,
    height: item.box.height,
  };
}

/**
 * Construit les boîtes couvrant un match [start,end), une par groupe de
 * lignes visuellement contiguës parmi les segments de texte qui le
 * chevauchent (voir `subBoxForOverlap` pour le découpage horizontal au sein
 * de chaque item).
 *
 * Pourquoi plusieurs boîtes et pas une seule union ? Un nom peut être coupé
 * en fin de ligne dans le PDF ("Monsieur Paul\nDelattre") : le texte extrait
 * contient alors un simple saut de ligne entre les deux morceaux, exactement
 * comme lorsque deux éléments SANS AUCUN RAPPORT se retrouvent l'un après
 * l'autre dans l'ordre du texte extrait à cause de la mise en page (ex : un
 * intitulé de colonne "PRÉSIDENT" suivi, quelques lignes plus bas, d'une
 * signature "Paul DELATTRE"). Une simple union des boîtes engendrerait un
 * rectangle qui engloberait aussi tout ce qu'il y a entre les deux lignes.
 * On regroupe donc les items par proximité verticale réelle (l'écart entre
 * deux lignes qui se suivent dans un même paragraphe est faible et régulier)
 * et on renvoie une boîte par groupe, plutôt qu'un unique rectangle pouvant
 * largement déborder de la donnée à masquer.
 */
function boxesForRange(
  items: PositionedTextItem[],
  start: number,
  end: number
): NormalizedBox[] {
  const overlapping = items
    .filter((item) => item.end > start && item.start < end)
    .map((item) => subBoxForOverlap(item, start, end))
    .sort((a, b) => a.y - b.y);

  const clusters: NormalizedBox[][] = [];
  for (const sub of overlapping) {
    const cluster = clusters[clusters.length - 1];
    const prev = cluster?.[cluster.length - 1];
    // Écart maximal toléré entre deux lignes consécutives pour les
    // considérer comme faisant partie du même saut de ligne "naturel",
    // exprimé en fraction de la hauteur de la ligne précédente.
    const maxGap = prev ? prev.height * 0.6 : 0;
    if (prev && sub.y - (prev.y + prev.height) <= maxGap) {
      cluster.push(sub);
    } else {
      clusters.push([sub]);
    }
  }

  return clusters
    .map((cluster) => cluster.reduce((acc, b) => (acc ? unionBox(acc, b) : b), null as NormalizedBox | null))
    .filter((b): b is NormalizedBox => b !== null);
}

export function detectPiiOnPage(
  pageIndex: number,
  pageText: string,
  items: PositionedTextItem[]
): Detection[] {
  const raw = dedupeNested([
    ...runRegexPatterns(pageText),
    ...runNameDetection(pageText),
  ]);

  const detections: Detection[] = [];
  for (const m of raw) {
    const boxes = boxesForRange(items, m.start, m.end);
    // Une détection par ligne visuellement contiguë (voir `boxesForRange`) :
    // le plus souvent une seule, parfois deux pour un nom coupé en fin de
    // ligne — jamais un rectangle unique pouvant déborder sur du texte sans
    // rapport situé entre deux fragments éloignés sur la page.
    for (const box of boxes) {
      detections.push({
        id: uuidv4(),
        page: pageIndex,
        type: m.type,
        text: m.text,
        box,
        confidence: m.confidence,
        source: items.some((i) => i.source === "ocr") ? "ocr" : m.source,
      });
    }
  }
  return detections;
}

/** Reconstruit le texte concaténé d'une page à partir de ses segments
 * positionnés, en conservant les offsets utilisés par `detectPiiOnPage`. */
export function buildPageText(items: PositionedTextItem[]): string {
  return items.map((i) => i.text).join("");
}
