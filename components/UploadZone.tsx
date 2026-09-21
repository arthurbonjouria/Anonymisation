"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        alert("Merci de sélectionner un fichier PDF.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-bw border-2 border-dashed p-12 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-bw-cloudy/30 bg-white/40 opacity-60"
          : isDragging
          ? "cursor-pointer border-bw-pink bg-bw-pink-soft/40"
          : "cursor-pointer border-bw-cloudy/40 bg-white hover:border-bw-pink"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-bw-pink"
      >
        <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-body text-sm text-bw-text">
        Glissez-déposez un PDF ici, ou <span className="text-bw-pink underline">cliquez pour choisir un fichier</span>
      </p>
      <p className="font-body text-xs text-bw-cloudy">
        Traitement 100% local — rien n'est envoyé à un service tiers.
      </p>
    </div>
  );
}
