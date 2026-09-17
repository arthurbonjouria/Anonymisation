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
}: DetectionPanelProps) {
  const includedCount = detections.filter((d) => included[d.id]).length;

  const byType = detections.reduce<Record<string, Detection[]>>((acc, d) => {
    (acc[d.type] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-bw-border bg-bw-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-200">
          Détections ({includedCount}/{detections.length} sélectionnées)
        </h2>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => onToggleAll(true)}
            className="rounded border border-bw-border px-2 py-1 hover:border-bw-accent"
          >
            Tout cocher
          </button>
          <button
            onClick={() => onToggleAll(false)}
            className="rounded border border-bw-border px-2 py-1 hover:border-bw-accent"
          >
            Tout décocher
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {Object.entries(byType).map(([type, items]) => (
          <div key={type}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              {TYPE_LABELS[type as PiiType] ?? type} ({items.length})
            </p>
            <ul className="space-y-1">
              {items.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                    d.page === activePage ? "bg-white/5" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!included[d.id]}
                    onChange={() => onToggle(d.id)}
                    className="h-3.5 w-3.5 accent-bw-accent"
                  />
                  <button
                    onClick={() => onJumpToPage(d.page)}
                    className="flex-1 truncate text-left text-gray-300 hover:text-white"
                    title={d.text}
                  >
                    {d.text}
                  </button>
                  <span className="shrink-0 text-[10px] text-gray-500">
                    p.{d.page + 1}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {detections.length === 0 && (
          <p className="text-sm text-gray-500">
            Aucune donnée personnelle détectée automatiquement.
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 rounded border border-bw-border p-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={aiNameDetectionEnabled}
          onChange={(e) => onToggleAiNameDetection(e.target.checked)}
          disabled
          className="mt-0.5 h-3.5 w-3.5"
        />
        <span>
          Améliorer la détection des noms via IA (désactivé par défaut).
          Nécessiterait un modèle local/self-hosted dédié — aucune donnée du
          document n'est envoyée à un service cloud dans cette application.
        </span>
      </label>
    </div>
  );
}
