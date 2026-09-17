/**
 * Patterns de détection des données personnelles (PII).
 *
 * Toute la détection se fait localement (regex + heuristiques), aucune donnée
 * du document n'est envoyée à un service tiers.
 *
 * Pour ajouter un nouveau pattern :
 *   1. Ajoute une entrée au tableau `PII_PATTERNS` ci-dessous.
 *   2. `type` doit correspondre à une valeur de `PiiType` dans `lib/types.ts`
 *      (ajoute-en une nouvelle si besoin).
 *   3. `regex` DOIT avoir le flag global `g` (utilisé avec `matchAll`).
 *   4. `confidence` est une estimation heuristique (0 à 1) utilisée pour le tri
 *      et l'affichage dans l'UI ; les regex très permissives (ex: adresses)
 *      devraient avoir une confiance plus basse.
 */

import type { PiiType } from "./types";

export interface PiiPattern {
  type: PiiType;
  label: string;
  description: string;
  regex: RegExp;
  confidence: number;
  /** Validation supplémentaire optionnelle (ex: clé de contrôle IBAN/NIR). */
  validate?: (match: string) => boolean;
}

// --- Email ------------------------------------------------------------
const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// --- Téléphone (France + international) --------------------------------
// Couvre : 06 12 34 56 78 / 06.12.34.56.78 / 0612345678 / +33 6 12 34 56 78
// / +33612345678 / (0033) 6 12 34 56 78, ainsi que la plupart des formats
// internationaux à 8-15 chiffres avec indicatif +.
const PHONE_FR_REGEX =
  /(?:(?:\+33|0033)[\s.-]?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/g;
const PHONE_INTL_REGEX = /\+\d{1,3}(?:[\s.-]?\d{2,4}){2,5}/g;

// --- IBAN ----------------------------------------------------------------
// Format générique IBAN (2 lettres pays + 2 chiffres de contrôle + jusqu'à 30
// caractères alphanumériques), avec ou sans espaces tous les 4 caractères.
const IBAN_REGEX =
  /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g;

// --- Numéro de sécurité sociale (NIR - France) ---------------------------
// Format : S AA MM DD LLL CCC KK (13 ou 15 chiffres, éventuellement séparés
// par des espaces). S = sexe (1/2, parfois 7/8), AA = année, MM = mois (01-12
// ou 20/30/40+DOM-TOM/inconnu), suivi du lieu de naissance et de la clé.
const NIR_REGEX =
  /\b[12]\s?\d{2}\s?(?:0[1-9]|1[0-2]|20|30|4\d)\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}(?:\s?\d{2})?\b/gi;

// --- Code postal français --------------------------------------------------
const POSTAL_CODE_FR_REGEX = /\b\d{5}\b/g;

// --- Adresse postale (heuristique) -----------------------------------------
// Numéro + type de voie + nom de voie, éventuellement suivi d'un code postal
// et d'une ville. Volontairement large -> confiance basse, à valider par
// l'utilisateur dans l'aperçu.
const ADDRESS_REGEX =
  /\b\d{1,4}(?:\s?(?:bis|ter|quater))?\s+(?:rue|avenue|av\.?|boulevard|bd\.?|impasse|allée|chemin|place|route|quai|square|cours|voie|lieu-dit)\s+[A-Za-zÀ-ÖØ-öø-ÿ0-9'’.\- ]{2,60}/gi;

// --- Dates (naissance / dates sensibles) ------------------------------------
// jj/mm/aaaa, jj-mm-aaaa, jj.mm.aaaa ou "12 janvier 1990"
const DATE_NUMERIC_REGEX = /\b(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](\d{4}|\d{2})\b/g;
const MONTHS_FR =
  "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre";
const DATE_LITERAL_REGEX = new RegExp(
  `\\b(0?[1-9]|[12]\\d|3[01])\\s+(?:${MONTHS_FR})\\s+(\\d{4})\\b`,
  "gi"
);

// --- Identifiants génériques (heuristique) ----------------------------------
// Chaînes ressemblant à un identifiant/numéro de pièce (8 à 20 caractères
// alphanumériques majuscules/chiffres mélangés) - confiance basse, sert de
// filet de sécurité pour les numéros de carte d'identité/passeport/client.
const GENERIC_ID_REGEX = /\b(?=[A-Z0-9]{8,20}\b)(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,20}\b/g;

function luhnLikeIbanCheck(iban: string): boolean {
  const cleaned = iban.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  // Rearrange: move first 4 chars to the end, convert letters to numbers
  // (A=10..Z=35), then check mod 97 === 1 (ISO 7064 MOD 97-10).
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (/[0-9]/.test(ch)) numeric += ch;
    else numeric += (ch.charCodeAt(0) - 55).toString();
  }
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = parseInt(remainder + numeric.slice(i, i + 7), 10) % 97;
  }
  return remainder === 1;
}

export const PII_PATTERNS: PiiPattern[] = [
  {
    type: "email",
    label: "Adresse email",
    description: "Adresses email (RFC simplifié)",
    regex: EMAIL_REGEX,
    confidence: 0.98,
  },
  {
    type: "phone",
    label: "Téléphone (FR)",
    description: "Numéros de téléphone français",
    regex: PHONE_FR_REGEX,
    confidence: 0.9,
  },
  {
    type: "phone",
    label: "Téléphone (international)",
    description: "Numéros de téléphone internationaux avec indicatif +",
    regex: PHONE_INTL_REGEX,
    confidence: 0.75,
  },
  {
    type: "iban",
    label: "IBAN",
    description: "Coordonnées bancaires IBAN",
    regex: IBAN_REGEX,
    confidence: 0.85,
    validate: luhnLikeIbanCheck,
  },
  {
    type: "nir",
    label: "Numéro de sécurité sociale",
    description: "NIR français (13-15 chiffres)",
    regex: NIR_REGEX,
    confidence: 0.85,
  },
  {
    type: "date_naissance",
    label: "Date (numérique)",
    description: "Dates au format jj/mm/aaaa",
    regex: DATE_NUMERIC_REGEX,
    confidence: 0.55,
  },
  {
    type: "date_naissance",
    label: "Date (littérale)",
    description: "Dates écrites en toutes lettres (ex: 12 janvier 1990)",
    regex: DATE_LITERAL_REGEX,
    confidence: 0.6,
  },
  {
    type: "postal_address",
    label: "Adresse postale",
    description: "Numéro + voie (heuristique)",
    regex: ADDRESS_REGEX,
    confidence: 0.5,
  },
  {
    type: "postal_code",
    label: "Code postal",
    description: "Code postal français à 5 chiffres",
    regex: POSTAL_CODE_FR_REGEX,
    confidence: 0.3,
  },
  {
    type: "custom",
    label: "Identifiant générique",
    description: "Chaîne alphanumérique ressemblant à un identifiant/pièce",
    regex: GENERIC_ID_REGEX,
    confidence: 0.25,
  },
];

/** Mots à ignorer pour l'heuristique de détection de noms propres (voir lib/name-detect.ts). */
export const NAME_STOPWORDS_FR = new Set(
  [
    "Le",
    "La",
    "Les",
    "Un",
    "Une",
    "Des",
    "De",
    "Du",
    "Et",
    "Ou",
    "Mais",
    "Donc",
    "Or",
    "Ni",
    "Car",
    "Ce",
    "Cette",
    "Ces",
    // Note : "Monsieur"/"Madame"/"Mademoiselle" sont volontairement ABSENTS
    // de cette liste. Ce sont des mots civils qui précèdent presque toujours
    // un vrai nom propre en français ("Monsieur Paul Delattre") : les
    // traiter comme un signal de rejet ferait échouer la détection par regex
    // sur tout nom précédé d'un titre de civilité, alors qu'on voudrait au
    // contraire s'appuyer sur cette regex en complément du NLP (qui ne
    // reconnaît pas toujours le nom de famille, en particulier lorsqu'il est
    // coupé par un saut de ligne).
    "Cher",
    "Chère",
    "Bonjour",
    "Cordialement",
    "Merci",
    "Fait",
    "Paris",
    "France",
    "Article",
    "Chapitre",
    "Annexe",
    "Section",
    "Objet",
    "Note",
    "Rapport",
  ].map((w) => w.toLowerCase())
);
