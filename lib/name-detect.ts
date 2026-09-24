/**
 * Détection heuristique des noms et prénoms, 100% locale.
 *
 * Deux approches combinées :
 *  1. Une regex capturant les suites de 2 à 3 mots capitalisés (ex: "Jean
 *     Dupont", "Marie-Claire Petit"), qui fonctionne raisonnablement bien en
 *     français.
 *  2. La librairie NLP légère `compromise` (`.people()`), qui apporte du
 *     rappel supplémentaire (surtout utile sur du texte anglais).
 *
 * Aucune des deux n'appelle de service externe : tout tourne dans le process
 * Node du serveur.
 *
 * Option IA locale (Ollama) : voir `lib/ollama-detect.ts`. Optionnelle et
 * activable uniquement quand un serveur Ollama tourne sur la même machine
 * (usage local, `npm run dev`/`npm run start`) — inactive et sans impact sur
 * un déploiement Vercel, qui ne peut pas atteindre l'Ollama de quelqu'un.
 */

import nlp from "compromise";
import { NAME_STOPWORDS_FR } from "./pii-patterns";
import { detectNamesWithOllama } from "./ollama-detect";

// `compromise` ne connaît quasiment aucun nom de ville française (son
// répertoire de lieux est anglophone) : `.places()` renvoie un tableau vide
// pour "Clermont-Ferrand", qui se fait donc régulièrement prendre pour un
// nom de personne par la regex "Prénom Nom" (deux mots capitalisés reliés
// par un tiret). Liste volontairement limitée aux grandes villes françaises
// au nom composé (les plus susceptibles de matcher ce motif) — pas
// exhaustive, mais couvre les cas les plus fréquents dans un document
// juridique/administratif français.
const KNOWN_FRENCH_PLACES = new Set(
  [
    "Clermont-Ferrand",
    "Saint-Étienne",
    "Saint-Etienne",
    "Aix-en-Provence",
    "Boulogne-Billancourt",
    "Saint-Denis",
    "Villeneuve-d'Ascq",
    "Châlons-en-Champagne",
    "Chalons-en-Champagne",
    "Le Havre",
    "Le Mans",
    "La Rochelle",
    "Saint-Nazaire",
    "Saint-Malo",
    "Issy-les-Moulineaux",
    "Neuilly-sur-Seine",
    "Levallois-Perret",
    "Charleville-Mézières",
    "Charleville-Mezieres",
    "Château-Thierry",
    "Chateau-Thierry",
  ].map((p) => p.toLowerCase())
);

export interface NameMatch {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

// Un "mot de nom" est soit en casse normale ("Julien"), soit ENTIÈREMENT EN
// MAJUSCULES ("BASTIDE") : la convention "Prénom NOM" (nom de famille en
// capitales) est très courante dans les actes officiels/juridiques français.
// Sans la variante tout-en-majuscules, un nom comme "Camille ROUSSEAU" ne
// matchait que "Camille" et laissait "ROUSSEAU" totalement visible dans le
// document anonymisé.
const NAME_WORD = "(?:[A-ZÀ-Ý][a-zà-ÿ'’]+|[A-ZÀ-Ý][A-ZÀ-Ý'’]+)";
// 2 à 3 mots de ce type consécutifs, tolère les tirets et apostrophes
// ("Jean-Baptiste", "D'Artagnan"), ainsi que n'importe quelle quantité
// d'espaces ou un saut de ligne entre les mots : un nom peut être coupé en
// fin de ligne dans le PDF source ("Monsieur Paul\nDelattre"), ou les items
// de texte concaténés peuvent laisser plusieurs espaces consécutifs — un
// simple espace unique comme séparateur laissait échapper le nom de famille
// dans ces cas.
const CAPITALIZED_SEQUENCE_REGEX = new RegExp(
  `\\b${NAME_WORD}(?:[\\s-]+${NAME_WORD}){1,2}\\b`,
  "g"
);

function isLikelyName(candidate: string): boolean {
  const words = candidate.split(/[\s-]+/);
  if (words.some((w) => NAME_STOPWORDS_FR.has(w.toLowerCase()))) return false;
  // Rejette les suites qui ressemblent à un titre de section / phrase.
  if (words.length > 3) return false;
  // Un candidat entièrement en majuscules (ex: "TRIBUNAL JUDICIAIRE", "PAR
  // CES MOTIFS") est un titre de section ou un sigle, pas un nom propre : un
  // vrai "Prénom NOM" a toujours au moins le prénom en casse normale, donc
  // au moins une lettre minuscule quelque part dans le candidat.
  if (!/[a-zà-ÿ]/.test(candidate)) return false;
  return true;
}

/**
 * Récupère les noms de lieux reconnus par `compromise` (villes, pays...),
 * pour les exclure ensuite des candidats "nom de personne". Sans ça, une
 * ville au nom composé comme "Clermont-Ferrand" (casse "Prénom Nom" typique)
 * est régulièrement prise pour un nom propre par la regex comme par
 * `compromise` lui-même, et se retrouvait masquée alors que ce n'est pas une
 * donnée personnelle.
 */
function getKnownPlaces(doc: ReturnType<typeof nlp>): Set<string> {
  try {
    return new Set((doc.places().out("array") as string[]).filter(Boolean));
  } catch {
    return new Set();
  }
}

function isKnownPlace(candidate: string, places: Set<string>): boolean {
  if (places.has(candidate)) return true;
  if (KNOWN_FRENCH_PLACES.has(candidate.toLowerCase())) return true;
  // Une ville citée avec sa préposition ("de Clermont-Ferrand") ou comme
  // dernier mot d'un candidat plus long doit aussi être reconnue.
  for (const place of places) {
    if (candidate === place || candidate.endsWith(` ${place}`)) return true;
  }
  for (const place of KNOWN_FRENCH_PLACES) {
    if (candidate.toLowerCase().endsWith(place)) return true;
  }
  return false;
}

function regexNameCandidates(text: string, places: Set<string>): NameMatch[] {
  const matches: NameMatch[] = [];
  for (const m of text.matchAll(CAPITALIZED_SEQUENCE_REGEX)) {
    const candidate = m[0];
    if (!isLikelyName(candidate)) continue;
    if (isKnownPlace(candidate, places)) continue;
    matches.push({
      text: candidate,
      start: m.index ?? 0,
      end: (m.index ?? 0) + candidate.length,
      confidence: 0.55,
    });
  }
  return matches;
}

function compromiseNameCandidates(text: string, places: Set<string>): NameMatch[] {
  const matches: NameMatch[] = [];
  try {
    const doc = nlp(text);
    const people = doc.people().out("array") as string[];
    for (const person of people) {
      if (!person || person.trim().length < 2) continue;
      if (isKnownPlace(person, places)) continue;
      let searchFrom = 0;
      let idx = text.indexOf(person, searchFrom);
      while (idx !== -1) {
        matches.push({
          text: person,
          start: idx,
          end: idx + person.length,
          confidence: 0.65,
        });
        searchFrom = idx + person.length;
        idx = text.indexOf(person, searchFrom);
      }
    }
  } catch {
    // compromise ne devrait jamais lever, mais on reste défensif : une
    // erreur ici ne doit pas casser toute la détection PII.
  }
  return matches;
}

/** Fusionne deux plages qui se chevauchent en une seule. */
function mergeOverlapping(matches: NameMatch[], sourceText: string): NameMatch[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const merged: NameMatch[] = [];
  for (const m of sorted) {
    const last = merged[merged.length - 1];
    if (last && m.start <= last.end) {
      const newEnd = Math.max(last.end, m.end);
      if (newEnd !== last.end) {
        // Re-découpe le texte affiché à partir du texte source : sans ça,
        // fusionner avec un match plus long ne faisait qu'étendre `end` en
        // gardant l'ancien texte (plus court) comme libellé, ce qui donnait
        // un aperçu trompeur dans l'UI (ex: "Monsieur Paul" affiché alors
        // que la zone masquée couvre en réalité "Monsieur Paul Delattre").
        last.text = sourceText.slice(last.start, newEnd);
      }
      last.end = newEnd;
      last.confidence = Math.max(last.confidence, m.confidence);
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}

export async function detectNames(
  text: string,
  useOllama: boolean = false
): Promise<NameMatch[]> {
  const places = getKnownPlaces(nlp(text));
  const combined = [
    ...regexNameCandidates(text, places),
    ...compromiseNameCandidates(text, places),
  ];

  if (useOllama) {
    // Complément optionnel : ne remplace jamais la regex + compromise
    // ci-dessus, vient seulement ajouter des noms qu'elles auraient manqués.
    // Confiance volontairement modérée (0.6) : un petit modèle local peut se
    // tromper, mieux vaut laisser l'utilisateur trancher dans l'aperçu que
    // masquer aveuglément sur la seule foi du LLM.
    try {
      const ollamaMatches = await detectNamesWithOllama(text);
      for (const m of ollamaMatches) {
        if (isKnownPlace(m.text, places)) continue;
        combined.push({ text: m.text, start: m.start, end: m.end, confidence: 0.6 });
      }
    } catch {
      // Dégradation silencieuse : une couche optionnelle ne doit jamais
      // faire échouer toute la détection PII.
    }
  }

  return mergeOverlapping(combined, text);
}
