"use client";

import type { Detection, PiiType } from "@/lib/types";

interface DetectionPanelProps {
  detections: Detection[];
  included: Record<string, boolean>;
  onToggle: (id: string) => void;
  onToggleAll: (included: boolean) => void;
  activePage: number;
  onJumpToPage: (page: number) => void;
  aiNameDetectionEnabled: boolean;
  onToggleAiNameDetection: (enabled: boolean) => void;
  /** null = statut pas encore connu, sinon disponibilité réelle d'Ollama. */
  ollamaAvailable: boolean | null;
  ollamaModel?: string;
}

const TYPE_LABELS: Record<PiiType, string> = {
  email: "Email",
  phone: "Téléphone",
  iban: "IBAN",
  nir: "Sécurité sociale",
  postal_address: "Adresse",
  postal_code: "Code postal",
  date_naissance: "Date",
  date: "Date",
  name: "Nom / Prénom",
  custom: "Identifiant",
};

export default function DetectionPanel({
  detections,
  included,
  onToggle,
  onToggleAll,
  activePage,
  onJumpToPage,
  aiNameDetectionEnabled,
  onToggleAiNameDetection,
  ollamaAvailable,
  ollamaModel,
}: DetectionPanelProps) {
  const includedCount = detections.filter((d) => included[d.id]).length;

  const byType = detections.reduce<Record<string, Detection[]>>((acc, d) => {
    (acc[d.type] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col gap-4 rounded-bw border border-bw-pink-soft bg-white p-4 shadow-bw">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-bw-text">
          Détections ({includedCount}/{detections.length} sélectionnées)
        </h2>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => onToggleAll(true)}
            className="rounded-full border border-bw-cloudy/40 px-2 py-1 font-heading hover:border-bw-pink hover:text-bw-pink"
          >
            Tout cocher
          </button>
          <button
            onClick={() => onToggleAll(false)}
            className="rounded-full border border-bw-cloudy/40 px-2 py-1 font-heading hover:border-bw-pink hover:text-bw-pink"
          >
            Tout décocher
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {Object.entries(byType).map(([type, items]) => (
          <div key={type}>
            <p className="mb-1 font-heading text-xs font-semibold uppercase tracking-wide text-bw-cloudy">
              {TYPE_LABELS[type as PiiType] ?? type} ({items.length})
            </p>
            <ul className="space-y-1">
              {items.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 font-body text-sm ${
                    d.page === activePage ? "bg-bw-pink-soft/40" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!included[d.id]}
                    onChange={() => onToggle(d.id)}
                    className="h-3.5 w-3.5 accent-bw-pink"
                  />
                  <button
                    onClick={() => onJumpToPage(d.page)}
                    className="flex-1 truncate text-left text-bw-text hover:text-bw-pink"
                    title={d.text}
                  >
                    {d.text}
                  </button>
                  <span className="shrink-0 text-[10px] text-bw-cloudy">
                    p.{d.page + 1}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {detections.length === 0 && (
          <p className="font-body text-sm text-bw-cloudy">
            Aucune donnée personnelle détectée automatiquement.
          </p>
        )}
      </div>

      <label
        className={`flex items-start gap-2 rounded-lg border p-2 font-body text-xs ${
          ollamaAvailable
            ? "border-bw-pink-soft text-bw-text"
            : "border-bw-cloudy/30 text-bw-cloudy"
        }`}
      >
        <input
          type="checkbox"
          checked={aiNameDetectionEnabled}
          onChange={(e) => onToggleAiNameDetection(e.target.checked)}
          disabled={!ollamaAvailable}
          className="mt-0.5 h-3.5 w-3.5 accent-bw-pink"
        />
        <span>
          Améliorer la détection des noms via Ollama (IA locale).{" "}
          {ollamaAvailable === null && "Vérification de la disponibilité d'Ollama…"}
          {ollamaAvailable === true && (
            <>
              Ollama détecté (modèle <code>{ollamaModel}</code>) — traitement
              100% local sur cette machine, jamais envoyé sur Internet. Un
              petit modèle reste faillible : vérifiez toujours l'aperçu.
            </>
          )}
          {ollamaAvailable === false &&
            "Indisponible ici (Ollama non détecté sur cette machine — normal si le site est hébergé sur Vercel)."}
        </span>
      </label>
    </div>
  );
}
