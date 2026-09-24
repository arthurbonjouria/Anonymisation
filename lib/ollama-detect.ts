/**
 * Détection de données personnelles par un LLM local via Ollama, utilisée en
 * mode "ai" (voir `lib/pii-detect.ts`) EN COMPLÉMENT des regex, jamais seule.
 *
 * Historique : une version antérieure demandait TOUT au LLM (emails,
 * téléphones, IBAN, NIR, dates de naissance inclus) et retirait les regex.
 * Testé en conditions réelles sur un document de 7 pages, ça a produit deux
 * échecs distincts et graves : (1) des pages entières où le modèle omettait
 * purement et simplement des IBAN/téléphones/emails pourtant présents en
 * clair dans le texte (silence radio, sans aucune erreur) ; (2) un candidat
 * halluciné de 2 caractères ("ne") accepté par la vérification "substring
 * exacte", qui a ensuite été recherché PARTOUT dans la page et a masqué des
 * fragments à l'intérieur de mots ordinaires ("vitrine" -> "vit█et"),
 * rendant le document illisible sans aucun rapport avec une vraie donnée
 * personnelle. Inacceptable pour un usage avocats/notaires.
 *
 * Ce module ne demande donc plus au LLM que ce que les regex ne savent PAS
 * bien faire : les noms de personnes et les adresses en texte libre
 * (nécessitent de comprendre le contexte), plus un identifiant personnel
 * générique en dernier recours. Tout ce qui a un format fixe et vérifiable
 * (email, téléphone, IBAN, NIR, code postal, date de naissance) reste géré
 * par `lib/pii-patterns.ts`, de façon déterministe et jamais silencieusement
 * défaillante.
 *
 * Optionnel et 100% local : n'a de sens QUE quand l'application tourne sur la
 * même machine qu'Ollama (usage local, `npm run dev`/`npm run start`). Un
 * serveur Vercel n'a aucun moyen d'atteindre `localhost:11434` sur le PC de
 * quelqu'un — ce mode est donc automatiquement indisponible une fois
 * déployé sur Vercel : `getOllamaStatus` échoue silencieusement (timeout
 * court) et l'app choisit alors le mode "regex" à l'ouverture du site (voir
 * `app/page.tsx`), seul mode qui fonctionne sans Ollama.
 *
 * Chaque élément renvoyé par le modèle est revérifié par recherche EXACTE
 * dans le texte source (un élément haluciné, absent du document, est
 * automatiquement ignoré) ET par une vérification de longueur minimale et de
 * limites de mots (voir `hasCleanWordBoundaries`) : un candidat trop court ou
 * qui ne commence/finit pas sur une frontière de mot est rejeté, précisément
 * pour empêcher la reproduction du bug "ne" décrit ci-dessus.
 *
 * Avec un petit modèle local (1B-4B), la qualité reste limitée — c'est
 * documenté clairement dans l'UI. La relecture humaine dans l'aperçu reste
 * indispensable avant de valider l'anonymisation.
 */

import type { PiiType } from "./types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
// Optionnel : force un modèle précis (doit correspondre exactement à
// `ollama list`). Si absent, ou si ce modèle n'est pas installé, le modèle
// est choisi automatiquement parmi ceux réellement disponibles (voir
// `pickModel`) plutôt que d'échouer sur un nom en dur qui ne correspond à
// rien sur la machine de l'utilisateur.
const OLLAMA_MODEL_ENV = process.env.OLLAMA_MODEL;

/**
 * Choisit le modèle à utiliser parmi ceux installés. Préférence : le modèle
 * forcé par env s'il existe vraiment, sinon un modèle "instruct" (meilleur
 * suivi de consignes de format pour une extraction JSON fiable), sinon le
 * premier modèle disponible.
 */
function pickModel(models: string[]): string | null {
  if (models.length === 0) return OLLAMA_MODEL_ENV || null;
  if (OLLAMA_MODEL_ENV && models.includes(OLLAMA_MODEL_ENV)) return OLLAMA_MODEL_ENV;
  const instruct = models.find((m) => /instruct/i.test(m));
  return instruct || models[0];
}

// Délai court pour la simple vérification de disponibilité (si Ollama n'est
// pas lancé — ex: déploiement Vercel — on ne doit jamais bloquer en
// attendant une connexion qui n'aboutira pas).
const AVAILABILITY_TIMEOUT_MS = 1200;

// Délai généreux pour la génération elle-même : l'inférence sur CPU/GPU
// grand public est loin d'être parfaitement constante d'un appel à l'autre
// (charge système, autres process, taille du texte...). Constaté en test
// réel : un même prompt a pris tantôt 31s, tantôt plus de 45s. Un timeout
// trop serré ne fait pas "planter proprement" — il fait silencieusement
// disparaître la détection sur la page concernée (dégradation silencieuse
// voulue pour ne jamais faire échouer tout l'upload), ce qui est bien pire
// pour un outil d'anonymisation que d'attendre plus longtemps.
const GENERATE_TIMEOUT_MS = 180000;

export interface OllamaStatus {
  available: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  error?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Vérifie si Ollama répond sur cette machine, et liste les modèles installés. */
export async function getOllamaStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/tags`,
      { method: "GET" },
      AVAILABILITY_TIMEOUT_MS
    );
    if (!res.ok) {
      return { available: false, baseUrl: OLLAMA_BASE_URL, model: OLLAMA_MODEL_ENV || "", models: [] };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = (data.models ?? []).map((m) => m.name);
    const model = pickModel(models) || "";
    return { available: models.length > 0, baseUrl: OLLAMA_BASE_URL, model, models };
  } catch (err) {
    return {
      available: false,
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL_ENV || "",
      models: [],
      error: err instanceof Error ? err.message : "Ollama injoignable",
    };
  }
}

// Types que le modèle est autorisé à renvoyer. Volontairement restreint aux
// catégories qui ont besoin de compréhension du contexte (pas de format
// fixe) : tout ce qui a un format vérifiable (email, téléphone, IBAN, NIR,
// code postal, date de naissance) est déjà couvert de façon déterministe par
// `lib/pii-patterns.ts` — voir le commentaire en tête de fichier.
const ALLOWED_TYPES: PiiType[] = ["name", "postal_address", "custom"];

// Longueur minimale (après trim) pour accepter un candidat, par type. Un
// filet de sécurité supplémentaire à `hasCleanWordBoundaries` : même un
// candidat qui tombe sur une frontière de mot peut être un mot isolé sans
// rapport ("ne", "un"...) plutôt qu'une vraie donnée personnelle.
const MIN_CANDIDATE_LENGTH: Partial<Record<PiiType, number>> = {
  name: 3,
  postal_address: 8,
  custom: 4,
};

const PROMPT_INSTRUCTIONS = `Tu es un assistant spécialisé dans la détection de données personnelles (RGPD) dans un extrait de document français, pour anonymisation.

Un autre système déjà fiable détecte séparément les emails, téléphones, IBAN, numéros de sécurité sociale (NIR), codes postaux isolés et dates de naissance. NE LES SIGNALE PAS, même si tu les vois dans le texte : ce n'est pas ton rôle ici.

Repère UNIQUEMENT les informations suivantes concernant des PERSONNES PHYSIQUES :
- name : prénom et/ou nom de famille d'un individu (partie, particulier, signataire...)
- postal_address : adresse postale complète (numéro + voie, éventuellement ville/code postal)
- custom : tout autre identifiant personnel évident non listé ci-dessus (numéro de pièce d'identité, de passeport, de client...)

Règles strictes :
- Ne renvoie QUE des extraits qui apparaissent MOT POUR MOT dans le texte fourni (même casse, mêmes espaces, aucune reformulation).
- N'invente jamais un extrait absent du texte.
- Ne renvoie jamais un fragment de mot coupé ou un extrait tronqué : chaque extrait doit commencer et finir sur une frontière de mot complète.
- N'inclus PAS les noms de lieux/villes, de sociétés, de tribunaux, de rues seules (sans numéro), ni les noms de juges/greffiers agissant dans leur fonction officielle.
- Si rien n'est trouvé pour une catégorie, ne l'inclus simplement pas.
- Réponds UNIQUEMENT avec un objet JSON de la forme {"items": [{"type": "name", "text": "Jean Dupont"}]}, sans aucun autre texte, sans explication.

Texte à analyser :
"""
{{TEXT}}
"""`;

interface GenerateResponse {
  response?: string;
}

export interface OllamaPiiMatch {
  type: PiiType;
  text: string;
  start: number;
  end: number;
}

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Vérifie que [start, end) commence et finit sur une vraie frontière de mot
 * dans `text`, plutôt qu'au milieu d'un mot plus long. Sans cette vérif, un
 * candidat de 2 lettres comme "ne" (halluciné pour la catégorie
 * date_naissance) matchait aussi le "ne" caché dans "tiennent", "vitrine",
 * "annexe"... et masquait des fragments de mots sans rapport partout dans
 * la page.
 */
function hasCleanWordBoundaries(text: string, start: number, end: number): boolean {
  const charBefore = start > 0 ? text[start - 1] : undefined;
  const charAfter = end < text.length ? text[end] : undefined;
  const startsMidWord = isWordChar(text[start]) && isWordChar(charBefore);
  const endsMidWord = isWordChar(text[end - 1]) && isWordChar(charAfter);
  return !startsMidWord && !endsMidWord;
}

/**
 * Demande au modèle local d'extraire toutes les données personnelles d'un
 * extrait de texte, et ne renvoie que celles qui apparaissent réellement
 * (recherche exacte) dans ce texte — un extrait halluciné par le modèle est
 * écarté, quel que soit son type annoncé.
 */
export async function detectPiiWithOllama(text: string): Promise<OllamaPiiMatch[]> {
  if (!text.trim()) return [];

  const status = await getOllamaStatus();
  if (!status.available || !status.model) return [];

  const prompt = PROMPT_INSTRUCTIONS.replace("{{TEXT}}", text.slice(0, 6000));

  let raw: string;
  try {
    const res = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: status.model,
          prompt,
          stream: false,
          format: "json",
          options: { temperature: 0 },
        }),
      },
      GENERATE_TIMEOUT_MS
    );
    if (!res.ok) return [];
    const data = (await res.json()) as GenerateResponse;
    raw = data.response ?? "";
  } catch (err) {
    // Ollama pas lancé, timeout, modèle inconnu... on dégrade silencieusement
    // vers "aucun résultat" plutôt que de faire planter tout l'upload à
    // cause d'un problème sur cette seule couche. On journalise quand même
    // (sans bloquer) pour pouvoir diagnostiquer une page qui ressort vide.
    console.warn("[ollama-detect] échec de la détection IA sur cette page :", err);
    return [];
  }

  let items: unknown;
  try {
    const parsed = JSON.parse(raw);
    items = parsed?.items;
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];

  const matches: OllamaPiiMatch[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const type = (item as any).type;
    const candidate = (item as any).text;
    if (typeof candidate !== "string") continue;
    if (!ALLOWED_TYPES.includes(type)) continue;
    const minLength = MIN_CANDIDATE_LENGTH[type as PiiType] ?? 4;
    if (candidate.trim().length < minLength) continue;

    // Le modèle peut légèrement reformuler malgré la consigne : on ne garde
    // que ce qui apparaît EXACTEMENT dans le texte source (aucune confiance
    // aveugle dans la sortie du LLM, quel que soit le type annoncé), ET qui
    // commence/finit sur une vraie frontière de mot (voir
    // `hasCleanWordBoundaries` : sans ça, un candidat halluciné de 2 lettres
    // comme "ne" se retrouve accepté n'importe où dans la page, y compris
    // au milieu d'un mot sans rapport comme "vitrine").
    let searchFrom = 0;
    let idx = text.indexOf(candidate, searchFrom);
    while (idx !== -1) {
      const end = idx + candidate.length;
      if (hasCleanWordBoundaries(text, idx, end)) {
        matches.push({ type, text: candidate, start: idx, end });
      }
      searchFrom = end;
      idx = text.indexOf(candidate, searchFrom);
    }
  }
  return matches;
}
