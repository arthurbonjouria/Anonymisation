"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bw-anonymisation-privacy-modal-seen";

const STEPS = [
  {
    title: "1. Lecture du document",
    text: "On extrait le texte du PDF. Si c'est un scan (une image, pas du texte), une reconnaissance de caractères (OCR) est utilisée pour le lire.",
  },
  {
    title: "2. Détection automatique",
    text: "Des règles locales (regex + reconnaissance de noms) repèrent ce qui ressemble à une donnée personnelle : noms, emails, téléphones, adresses, IBAN, dates...",
  },
  {
    title: "3. Votre vérification",
    text: "Vous voyez toutes les zones détectées sur l'aperçu et décidez lesquelles garder, en ajouter, ou en retirer avant de valider.",
  },
  {
    title: "4. Anonymisation réelle",
    text: "Les pages concernées sont transformées en image avec les zones masquées en noir : le texte d'origine est supprimé, pas seulement caché.",
  },
];

export default function PrivacyModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage indisponible (navigation privée, etc.) : on affiche
      // quand même la pop-up par prudence, tant pis si elle revient à
      // chaque visite.
      setOpen(true);
    }
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Rien de grave si on ne peut pas mémoriser le choix.
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-bw-pink-soft bg-white font-heading text-sm text-bw-cloudy shadow-bw hover:border-bw-pink hover:text-bw-pink"
        title="Confidentialité et fonctionnement"
        aria-label="Confidentialité et fonctionnement"
      >
        i
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bw-text/60 p-4"
          onClick={close}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-bw border border-bw-pink-soft bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/bonjouria-logo-noir-et-rose.svg"
              alt="BONJOUR IA"
              className="mb-4 h-8 w-auto"
            />
            <h2 className="font-heading text-lg font-bold text-bw-text">
              Vos fichiers ne sont jamais enregistrés
            </h2>
            <p className="mt-2 font-body text-sm text-bw-text/80">
              Le PDF que vous déposez est traité uniquement en mémoire, le
              temps de la requête — jamais écrit sur un disque, jamais envoyé
              à un service tiers ou à une IA cloud. Il disparaît aussitôt le
              traitement terminé.
            </p>

            <h3 className="mt-5 font-heading text-sm font-semibold uppercase tracking-wide text-bw-pink">
              Comment fonctionne l&apos;anonymisation
            </h3>
            <ol className="mt-3 space-y-3">
              {STEPS.map((step) => (
                <li key={step.title} className="font-body text-sm">
                  <p className="font-heading font-medium text-bw-text">{step.title}</p>
                  <p className="text-bw-cloudy">{step.text}</p>
                </li>
              ))}
            </ol>

            <button
              onClick={close}
              className="mt-6 w-full rounded-full bg-bw-pink px-4 py-2.5 font-heading text-sm font-semibold text-white shadow-bw hover:bg-bw-pink-dark"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
