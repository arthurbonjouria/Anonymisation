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
 * Option IA (désactivée par défaut) : voir `ENABLE_AI_NAME_DETECTION` plus
 * bas. Elle n'est PAS implémentée volontairement pour ne jamais faire fuiter
 * le contenu d'un document vers un LLM cloud ; le flag existe uniquement pour
 * documenter/afficher clairement l'option dans l'UI (case à cocher désactivée
 * avec message explicatif).
 */

import nlp from "compromise";
import { NAME_STOPWORDS_FR } from "./pii-patterns";

/** Toujours `false` : voir le commentaire ci-dessus. Ne pas activer sans
 * avoir mis en place un modèle local/self-hosted et sans avoir prévenu
 * l'utilisateur explicitement dans l'UI. */
export const ENABLE_AI_NAME_DETECTION = false;

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

function regexNameCandidates(text: string): NameMatch[] {
  const matches: NameMatch[] = [];
  for (const m of text.matchAll(CAPITALIZED_SEQUENCE_REGEX)) {
    const candidate = m[0];
    if (!isLikelyName(candidate)) continue;
    matches.push({
      text: candidate,
      start: m.index ?? 0,
      end: (m.index ?? 0) + candidate.length,
      confidence: 0.55,
    });
  }
  return matches;
}

function compromiseNameCandidates(text: string): NameMatch[] {
  const matches: NameMatch[] = [];
  try {
    const doc = nlp(text);
    const people = doc.people().out("array") as string[];
    for (const person of people) {
      if (!person || person.trim().length < 2) continue;
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

export function detectNames(text: string): NameMatch[] {
  const combined = [...regexNameCandidates(text), ...compromiseNameCandidates(text)];
  return mergeOverlapping(combined, text);
}
