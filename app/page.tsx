"use client";

import { useCallback, useMemo, useState } from "react";
import UploadZone from "@/components/UploadZone";
import DetectionPanel from "@/components/DetectionPanel";
import PdfPreview, { ManualZone } from "@/components/PdfPreview";
import PrivacyModal from "@/components/PrivacyModal";
import type { AnonymizeZone, Detection, UploadResponse } from "@/lib/types";

type Step = "upload" | "review" | "done";

// Confiance en dessous de laquelle une détection est affichée mais décochée
// par défaut (trop de risque de faux positif pour la masquer automatiquement).
const DEFAULT_INCLUDE_THRESHOLD = 0.5;

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  // Gardé côté client (jamais renvoyé par le serveur) pour renvoyer le PDF
  // d'origine à /api/anonymize : chaque requête est ainsi indépendante, sans
  // aucun état à conserver côté serveur entre l'upload et l'anonymisation —
  // indispensable pour un déploiement sur une plateforme serverless (Vercel),
  // où deux requêtes successives peuvent atterrir sur deux instances
  // différentes qui ne partagent pas de mémoire.
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [manualZones, setManualZones] = useState<ManualZone[]>([]);
  const [addZoneMode, setAddZoneMode] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("document_anonymise.pdf");

  const handleFileSelected = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Échec de l'analyse du PDF.");
      }
      const data: UploadResponse = await res.json();
      setUploadResult(data);
      setOriginalFile(file);

      const initialIncluded: Record<string, boolean> = {};
      for (const d of data.detections as Detection[]) {
        initialIncluded[d.id] = d.confidence >= DEFAULT_INCLUDE_THRESHOLD;
      }
      setIncluded(initialIncluded);
      setManualZones([]);
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleAnonymize = useCallback(async () => {
    if (!uploadResult || !originalFile) return;
    setError(null);
    setIsAnonymizing(true);
    try {
      const zones: AnonymizeZone[] = [
        ...uploadResult.detections
          .filter((d) => included[d.id])
          .map((d) => ({ page: d.page, box: d.box })),
        ...manualZones.map((z) => ({ page: z.page, box: z.box })),
      ];

      const formData = new FormData();
      formData.append("file", originalFile);
      formData.append("zones", JSON.stringify(zones));
      const res = await fetch("/api/anonymize", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Échec de l'anonymisation.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultFileName(uploadResult.fileName.replace(/\.pdf$/i, "") + "_anonymise.pdf");
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsAnonymizing(false);
    }
  }, [uploadResult, originalFile, included, manualZones]);

  const resetAll = useCallback(() => {
    setStep("upload");
    setUploadResult(null);
    setOriginalFile(null);
    setIncluded({});
    setManualZones([]);
    setResultUrl(null);
    setError(null);
  }, []);

  const zoneCount = useMemo(() => {
    if (!uploadResult) return 0;
    const includedDetections = uploadResult.detections.filter((d) => included[d.id]).length;
    return includedDetections + manualZones.length;
  }, [uploadResult, included, manualZones]);

  return (
    <div className="flex min-h-screen flex-col bg-bw-bg font-body">
      <PrivacyModal />

      <header className="border-b border-bw-pink-soft bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/bonjouria-logo-noir-et-rose.svg"
            alt="BONJOUR IA"
            className="h-10 w-auto"
          />
          <span className="hidden font-heading text-sm font-semibold text-bw-cloudy sm:block">
            Anonymisation de PDF
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-bw-text">
            Anonymisation de <span className="text-bw-pink">PDF</span>
          </h1>
          <p className="mt-1 font-body text-sm text-bw-cloudy">
            Détection et suppression irréversible des données personnelles,
            entièrement en local — rien n&apos;est jamais envoyé à un service tiers.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-bw border border-bw-danger/30 bg-bw-danger/5 px-4 py-3 font-body text-sm text-bw-danger">
            {error}
          </div>
        )}

        {step === "upload" && (
          <UploadZone onFileSelected={handleFileSelected} disabled={isUploading} />
        )}
        {isUploading && (
          <p className="mt-4 font-body text-sm text-bw-cloudy">
            Analyse du PDF en cours (extraction de texte, OCR si nécessaire,
            détection des données personnelles)…
          </p>
        )}

        {step === "review" && uploadResult && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setAddZoneMode((v) => !v)}
                  className={`rounded-full border px-4 py-1.5 font-heading text-sm font-medium transition-colors ${
                    addZoneMode
                      ? "border-bw-pink bg-bw-pink/10 text-bw-pink"
                      : "border-bw-cloudy/40 text-bw-text hover:border-bw-pink"
                  }`}
                >
                  {addZoneMode ? "Mode ajout de zone (cliquer-glisser)" : "Ajouter une zone manuelle"}
                </button>
                <span className="font-body text-xs text-bw-cloudy">
                  Cliquez sur une zone rose pour l&apos;exclure/inclure. Cliquez sur
                  une zone sombre pour la supprimer.
                </span>
              </div>
              <PdfPreview
                pages={uploadResult.pages}
                detections={uploadResult.detections}
                included={included}
                onToggleDetection={(id) =>
                  setIncluded((prev) => ({ ...prev, [id]: !prev[id] }))
                }
                manualZones={manualZones}
                onAddManualZone={(zone) => setManualZones((prev) => [...prev, zone])}
                onRemoveManualZone={(id) =>
                  setManualZones((prev) => prev.filter((z) => z.id !== id))
                }
                addZoneMode={addZoneMode}
              />
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex h-[70vh] flex-col gap-4">
                <DetectionPanel
                  detections={uploadResult.detections}
                  included={included}
                  onToggle={(id) =>
                    setIncluded((prev) => ({ ...prev, [id]: !prev[id] }))
                  }
                  onToggleAll={(value) => {
                    const next: Record<string, boolean> = {};
                    for (const d of uploadResult.detections) next[d.id] = value;
                    setIncluded(next);
                  }}
                  activePage={activePage}
                  onJumpToPage={(page) => {
                    setActivePage(page);
                    document
                      .getElementById(`page-${page}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  aiNameDetectionEnabled={false}
                  onToggleAiNameDetection={() => {}}
                />
                <button
                  onClick={handleAnonymize}
                  disabled={isAnonymizing || zoneCount === 0}
                  className="rounded-full bg-bw-pink px-4 py-2.5 font-heading text-sm font-semibold text-white shadow-bw transition-colors hover:bg-bw-pink-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isAnonymizing
                    ? "Anonymisation en cours…"
                    : `Anonymiser (${zoneCount} zone${zoneCount > 1 ? "s" : ""})`}
                </button>
                <button
                  onClick={resetAll}
                  className="font-body text-xs text-bw-cloudy hover:text-bw-text"
                >
                  Annuler et repartir d&apos;un autre fichier
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && resultUrl && (
          <div className="flex flex-col items-center gap-4 rounded-bw border border-bw-pink-soft bg-white p-10 text-center shadow-bw">
            <p className="font-heading text-lg font-semibold text-bw-text">
              PDF anonymisé généré avec succès.
            </p>
            <p className="max-w-md font-body text-sm text-bw-cloudy">
              Les pages contenant des données masquées ont été converties en
              image : le texte original n&apos;est plus présent dans le fichier et ne
              peut pas être récupéré par copier-coller.
            </p>
            <a
              href={resultUrl}
              download={resultFileName}
              className="rounded-full bg-bw-pink px-6 py-2.5 font-heading text-sm font-semibold text-white shadow-bw transition-colors hover:bg-bw-pink-dark"
            >
              Télécharger le PDF anonymisé
            </a>
            <button
              onClick={resetAll}
              className="font-body text-xs text-bw-cloudy hover:text-bw-text"
            >
              Anonymiser un autre fichier
            </button>
          </div>
        )}
      </main>

      <footer className="bg-bw-text py-6 text-center font-heading text-xs text-bw-cloudy">
        BONJOUR IA — Cabinet de Conseil IA &amp; Organisme de Formation<br />
        SIRET 43358085900026 | N° DA : 83630345463 | Certifié Qualiopi<br />
        19, Avenue Marx Dormoy — 63 000 Clermont-Ferrand | contact@bonjouria.fr | bonjouria.fr
      </footer>
    </div>
  );
}
