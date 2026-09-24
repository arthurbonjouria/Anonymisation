/**
 * Détection de noms assistée par un LLM local via Ollama.
 *
 * Optionnel et 100% local : n'a de sens QUE quand l'application tourne sur la
 * même machine qu'Ollama (usage local, `npm run dev`/`npm run start`). Un
 * serveur Vercel n'a aucun moyen d'atteindre `localhost:11434` sur le PC de
 * quelqu'un — cette fonctionnalité est donc automatiquement inactive une
 * fois déployée sur Vercel, sans configuration à faire : `isOllamaAvailable`
 * échoue silencieusement (timeout court) et l'app retombe sur la détection
 * par règles (regex + `compromise`), qui reste la seule utilisée en ligne.
 *
 * Rôle : COMPLÉMENT à la détection par règles, jamais un remplacement. Les
 * regex (email, téléphone, IBAN, NIR...) sont déterministes et fiables :
 * elles restent seules responsables de ces types. Le LLM ne sert qu'à
 * repérer des noms de personnes que la regex + `compromise` auraient
 * manqués (noms rares, tournures inhabituelles, contexte...). Chaque nom
 * renvoyé par le modèle est revérifié par recherche exacte dans le texte
 * source : un nom halluciné (qui n'apparaît pas tel quel dans le document)
 * est automatiquement ignoré.
 *
 * Avec un petit modèle local (1B-3B), la qualité reste limitée — c'est
 * documenté clairement dans l'UI : cette couche AIDE, elle ne garantit pas
 * une détection parfaite à elle seule. La relecture humaine dans l'aperçu
 * reste indispensable.
 */

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

// Délais courts : si Ollama n'est pas lancé (ex: déploiement Vercel, ou
// simplement pas démarré localement), on ne doit jamais ralentir/bloquer le
// reste de la détection en attendant une connexion qui n'aboutira pas.
const AVAILABILITY_TIMEOUT_MS = 1200;
const GENERATE_TIMEOUT_MS = 25000;

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

const PROMPT_INSTRUCTIONS = `Tu es un assistant qui repère les NOMS DE PERSONNES PHYSIQUES (prénom et/ou nom de famille d'individus) dans un extrait de document français.

Règles strictes :
- Ne renvoie QUE des noms qui apparaissent MOT POUR MOT dans le texte fourni (même casse, mêmes espaces).
- N'invente jamais de nom absent du texte.
- Inclus les noms des parties, particuliers, signataires mentionnés.
- N'inclus PAS les noms de lieux, de sociétés, de tribunaux, de rues.
- Réponds UNIQUEMENT avec un objet JSON de la forme {"names": ["Nom1", "Nom2"]}, sans aucun autre texte.

Texte à analyser :
"""
{{TEXT}}
"""`;

interface GenerateResponse {
  response?: string;
}

/**
 * Demande au modèle local d'extraire les noms de personnes d'un extrait de
 * texte, et ne renvoie que ceux qui apparaissent réellement (recherche
 * exacte) dans ce texte — un nom halluciné par le modèle est écarté.
 */
export async function detectNamesWithOllama(
  text: string
): Promise<{ text: string; start: number; end: number }[]> {
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
  } catch {
    // Ollama pas lancé, timeout, modèle inconnu... on dégrade silencieusement
    // vers "aucun résultat supplémentaire" plutôt que de faire échouer toute
    // la détection PII à cause d'une couche optionnelle.
    return [];
  }

  let names: unknown;
  try {
    const parsed = JSON.parse(raw);
    names = parsed?.names;
  } catch {
    return [];
  }
  if (!Array.isArray(names)) return [];

  const matches: { text: string; start: number; end: number }[] = [];
  for (const candidate of names) {
    if (typeof candidate !== "string" || candidate.trim().length < 2) continue;
    // Le modèle peut légèrement reformuler malgré la consigne : on ne garde
    // que ce qui apparaît EXACTEMENT dans le texte source (aucune confiance
    // aveugle dans la sortie du LLM).
    let searchFrom = 0;
    let idx = text.indexOf(candidate, searchFrom);
    while (idx !== -1) {
      matches.push({ text: candidate, start: idx, end: idx + candidate.length });
      searchFrom = idx + candidate.length;
      idx = text.indexOf(candidate, searchFrom);
    }
  }
  return matches;
}
