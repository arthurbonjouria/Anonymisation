# Anonymisation PDF — Bonjour World

Application web locale pour détecter automatiquement les données
personnelles (PII) dans un PDF et générer une version anonymisée,
irréversiblement, sans jamais envoyer le contenu du document à un service
tiers.

## Fonctionnement

1. **Upload** : glisser-déposer ou sélection d'un PDF.
2. **Extraction** :
   - texte vectoriel natif via `pdfjs-dist` ;
   - si une page contient très peu de texte natif (PDF scanné/image), bascule
     automatique en OCR via `tesseract.js`.
3. **Détection PII**, entièrement locale :
   - regex (email, téléphone FR/international, IBAN avec validation de clé,
     NIR/sécurité sociale, adresse postale, code postal, dates) — voir
     [`lib/pii-patterns.ts`](lib/pii-patterns.ts) ;
   - noms/prénoms via une heuristique regex (suites de mots capitalisés) +
     la librairie NLP légère `compromise` — voir [`lib/name-detect.ts`](lib/name-detect.ts).
4. **Aperçu** : chaque page est affichée avec les zones détectées surlignées
   en rouge. On peut décocher une zone (case dans le panneau ou clic sur le
   rectangle), ou ajouter une zone manuelle en cliquant-glissant sur la page.
5. **Anonymisation réelle** : pour chaque page contenant au moins une zone
   confirmée, la page est **rasterisée** (rendue en image) avec des
   rectangles opaques dessinés sur les zones à masquer, puis cette image
   remplace entièrement la page dans le PDF final. Le texte vectoriel
   original de ces pages est donc supprimé du fichier — impossible de le
   récupérer par un copier-coller, même en retirant le rectangle. Les pages
   sans donnée sensible restent inchangées (texte vectoriel préservé).
6. **Téléchargement** du PDF anonymisé.
7. **Rien n'est jamais stocké** : chaque appel serveur (`/api/upload` puis
   `/api/anonymize`) est indépendant et sans état — le fichier original est
   traité en mémoire le temps de la requête HTTP, puis disparaît. C'est le
   navigateur qui garde le fichier original le temps que vous ajustiez les
   zones dans l'aperçu, et qui le renvoie au serveur au moment de valider
   l'anonymisation (voir `handleAnonymize` dans [`app/page.tsx`](app/page.tsx)).
   Ce choix d'architecture (pas de session ni de fichier gardé côté serveur
   entre deux requêtes) est ce qui rend l'app déployable sur une plateforme
   serverless (Vercel) sans base de données ni stockage partagé.

## Confidentialité

- Aucun appel à une API cloud/LLM sur le contenu du document. Toute la
  détection (regex + NLP) tourne dans le process Node local.
- Aucune écriture disque du fichier uploadé ou du résultat, et aucun état
  gardé côté serveur entre deux requêtes : tout reste en mémoire le temps de
  traiter la requête HTTP en cours, rien n'est jamais persisté (voir point 7
  ci-dessus).
- `tesseract.js` télécharge uniquement le **modèle de langue** (fichiers
  `.traineddata`) au premier lancement, jamais le contenu du document. Pour
  un fonctionnement strictement hors-ligne, pré-téléchargez les fichiers
  `fra.traineddata` / `eng.traineddata` et configurez `langPath` dans
  [`lib/ocr.ts`](lib/ocr.ts) (`createWorker("fra+eng", 1, { langPath: "..." })`).
- Une case "Améliorer la détection des noms via IA" est visible dans l'UI
  mais **désactivée par défaut et non branchée à un service externe**,
  conformément à l'exigence de confidentialité : elle documente simplement
  l'option pour une éventuelle évolution future avec un modèle self-hosted.

## Sécurité (npm audit)

`npm audit` signale des CVE sur `next@14.2.35` (correctif complet uniquement
disponible en migrant vers Next 16, changement majeur non appliqué ici par
prudence) et sur `postcss` embarqué par Next. Ces CVE concernent surtout le
Server Actions / Middleware / Image Optimizer d'un déploiement public
exposé sur Internet. Cette application est prévue pour un usage **local**
(dev server sur `localhost`) ; si vous l'exposez publiquement, mettez à jour
Next.js au préalable (`npm audit fix --force`, puis testez) et placez-la
derrière une authentification/reverse proxy.

## Limites connues

- La détection de noms propres est heuristique (regex + `compromise`, plutôt
  optimisé pour l'anglais) : à vérifier/compléter manuellement dans
  l'aperçu, en particulier sur du texte français.
- L'OCR peut manquer des mots sur des scans de mauvaise qualité ; toujours
  vérifier l'aperçu avant de valider l'anonymisation.
- Sur un hébergement serverless (Vercel), un PDF scanné volumineux à OCRiser
  peut approcher la limite de durée d'une fonction (voir section Déploiement
  ci-dessous) : testez avec vos documents réels après déploiement.

## Déploiement sur Vercel

Cette application est un projet Next.js standard et se déploie sur
[Vercel](https://vercel.com) (créateurs de Next.js) sans configuration
particulière au-delà de ce qui est déjà dans le dépôt.

**Important : cette app ne peut PAS être déployée sur un hébergement PHP/
statique comme InfinityFree.** Elle a besoin d'un vrai serveur Node.js
(extraction PDF, OCR, rendu d'image via un module natif) qui tourne à la
demande — c'est exactement ce que fournit Vercel (ou Render/Railway/Fly.io/
un VPS), pas un hébergeur mutualisé PHP.

### Déployer

```bash
npm install -g vercel   # une seule fois
vercel login            # une seule fois, ouvre le navigateur
vercel                  # depuis la racine du projet : déploiement de test
vercel --prod           # déploiement en production, sur le domaine final
```

Ou, plus simple si le projet est sur GitHub/GitLab : importer le dépôt depuis
[vercel.com/new](https://vercel.com/new) — Vercel détecte Next.js
automatiquement, aucune variable d'environnement n'est nécessaire.

### Points d'attention spécifiques à Vercel

- **Pas de stockage entre deux requêtes** : l'app a été conçue pour ça (voir
  "Fonctionnement" ci-dessus) — chaque requête est indépendante, ce qui est
  obligatoire sur une plateforme serverless où deux appels successifs
  peuvent atterrir sur deux instances différentes qui ne partagent pas de
  mémoire.
- **Polices/cmaps de `pdfjs-dist`** : le rendu des pages en image (aperçu et
  anonymisation) a besoin des fichiers de polices standard et des cmaps
  fournis par `pdfjs-dist`, lus dynamiquement sur disque. Sans précaution,
  Vercel ne les inclurait pas dans le paquet de la fonction déployée (ils ne
  sont pas `require()`-és directement). C'est pourquoi
  [`next.config.js`](next.config.js) déclare `outputFileTracingIncludes`
  pour forcer leur inclusion — ne pas retirer ce bloc.
- **Taille de fichier** : les fonctions Node.js de Vercel acceptent des
  requêtes jusqu'à environ 4,5 Mo sur le plan gratuit (Hobby). Un PDF plus
  volumineux (scan haute résolution notamment) sera rejeté par Vercel avant
  même d'atteindre le code de l'app. Le plan Pro augmente cette limite.
- **Durée d'exécution** : l'OCR d'un PDF scanné de plusieurs pages peut être
  lent. Chaque route déclare `export const maxDuration = 120` (120 secondes),
  mais le plan Hobby plafonne à 60 secondes réelles quoi qu'il arrive ; le
  plan Pro permet d'aller jusqu'à 300 secondes. Sur des scans volumineux,
  prévoyez un upgrade vers Pro si des timeouts apparaissent.
- **`@napi-rs/canvas`** : ce module fournit des binaires précompilés pour
  l'environnement Linux x86_64 utilisé par Vercel — aucune compilation
  native n'est nécessaire au déploiement.

## Lancer le projet en local

Prérequis : Node.js 18+.

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

Build de production :

```bash
npm run build
npm run start
```

## Tests

```bash
npm test
```

Tests unitaires de base sur la détection par regex : email, téléphone,
IBAN (avec validation de clé MOD 97-10), NIR, dates — voir
[`__tests__/pii-patterns.test.ts`](__tests__/pii-patterns.test.ts).

## Ajouter un nouveau pattern de détection

Tout se passe dans [`lib/pii-patterns.ts`](lib/pii-patterns.ts) : ajouter une
entrée à `PII_PATTERNS` avec :

```ts
{
  type: "custom",          // ou un nouveau type ajouté à PiiType (lib/types.ts)
  label: "Mon pattern",
  description: "...",
  regex: /votre-regex/g,   // le flag "g" est obligatoire
  confidence: 0.7,         // 0..1, influence l'inclusion par défaut dans l'UI
  validate: (match) => true, // optionnel : validation supplémentaire (clé de contrôle, etc.)
}
```

Le pattern sera automatiquement appliqué à toutes les pages (texte natif ou
OCR) et ses correspondances projetées sur les bonnes zones dans l'aperçu.

## Structure du projet

```
app/
  page.tsx                 page unique (upload -> aperçu -> anonymisation -> téléchargement)
  api/upload/route.ts       upload + extraction + détection PII
  api/anonymize/route.ts    génération et téléchargement du PDF anonymisé
components/
  UploadZone.tsx
  PdfPreview.tsx
  DetectionPanel.tsx
  PrivacyModal.tsx          pop-up "confidentialité + fonctionnement" au chargement
lib/
  pii-patterns.ts           regex PII (commentées, configurables)
  name-detect.ts            détection heuristique des noms/prénoms
  pii-detect.ts             application des patterns + projection sur les positions
  pdf-extract.ts            extraction du texte natif (pdfjs-dist)
  pdf-render.ts             rendu PDF -> image (aperçu, OCR, rasterisation)
  ocr.ts                    OCR des pages scannées (tesseract.js)
  pdf-redact.ts             construction du PDF anonymisé (pdf-lib)
  types.ts                  types partagés
__tests__/
  pii-patterns.test.ts
```
