"use client";

import { useState } from "react";
import type { Detection, NormalizedBox, PageInfo } from "@/lib/types";

export interface ManualZone {
  id: string;
  page: number;
  box: NormalizedBox;
}

interface PdfPreviewProps {
  pages: PageInfo[];
  detections: Detection[];
  included: Record<string, boolean>;
  onToggleDetection: (id: string) => void;
  manualZones: ManualZone[];
  onAddManualZone: (zone: ManualZone) => void;
  onRemoveManualZone: (id: string) => void;
  addZoneMode: boolean;
}

interface DragState {
  page: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export default function PdfPreview({
  pages,
  detections,
  included,
  onToggleDetection,
  manualZones,
  onAddManualZone,
  onRemoveManualZone,
  addZoneMode,
}: PdfPreviewProps) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const detectionsByPage = detections.reduce<Record<number, Detection[]>>((acc, d) => {
    (acc[d.page] ||= []).push(d);
    return acc;
  }, {});
  const manualByPage = manualZones.reduce<Record<number, ManualZone[]>>((acc, z) => {
    (acc[z.page] ||= []).push(z);
    return acc;
  }, {});

  function toNormalized(
    e: React.MouseEvent<HTMLDivElement>,
    container: HTMLDivElement
  ) {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {pages.map((page) => (
        <div
          key={page.index}
          id={`page-${page.index}`}
          className="relative select-none rounded-lg border border-bw-border shadow-lg"
          style={{ width: "100%", maxWidth: 820, cursor: addZoneMode ? "crosshair" : "default" }}
          onMouseDown={(e) => {
            if (!addZoneMode) return;
            const container = e.currentTarget;
            const { x, y } = toNormalized(e, container);
            setDrag({ page: page.index, startX: x, startY: y, currentX: x, currentY: y });
          }}
          onMouseMove={(e) => {
            if (!drag || drag.page !== page.index) return;
            const container = e.currentTarget;
            const { x, y } = toNormalized(e, container);
            setDrag({ ...drag, currentX: x, currentY: y });
          }}
          onMouseUp={() => {
            if (!drag || drag.page !== page.index) {
              setDrag(null);
              return;
            }
            const box: NormalizedBox = {
              x: Math.min(drag.startX, drag.currentX),
              y: Math.min(drag.startY, drag.currentY),
              width: Math.abs(drag.currentX - drag.startX),
              height: Math.abs(drag.currentY - drag.startY),
            };
            setDrag(null);
            if (box.width < 0.005 || box.height < 0.005) return;
            onAddManualZone({
              id: `manual-${page.index}-${Date.now()}`,
              page: page.index,
              box,
            });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.imageDataUrl}
            alt={`Page ${page.index + 1}`}
            className="block w-full rounded-lg"
            draggable={false}
          />

          {(detectionsByPage[page.index] ?? []).map((d) => (
            <div
              key={d.id}
              className={`detection-box ${included[d.id] ? "" : "excluded"}`}
              style={{
                left: `${d.box.x * 100}%`,
                top: `${d.box.y * 100}%`,
                width: `${d.box.width * 100}%`,
                height: `${d.box.height * 100}%`,
              }}
              title={`${d.text} (clic pour ${included[d.id] ? "exclure" : "inclure"})`}
              onClick={() => onToggleDetection(d.id)}
            />
          ))}

          {(manualByPage[page.index] ?? []).map((z) => (
            <div
              key={z.id}
              className="detection-box manual"
              style={{
                left: `${z.box.x * 100}%`,
                top: `${z.box.y * 100}%`,
                width: `${z.box.width * 100}%`,
                height: `${z.box.height * 100}%`,
              }}
              title="Zone manuelle (clic pour supprimer)"
              onClick={() => onRemoveManualZone(z.id)}
            />
          ))}

          {drag && drag.page === page.index && (
            <div
              className="detection-box manual"
              style={{
                left: `${Math.min(drag.startX, drag.currentX) * 100}%`,
                top: `${Math.min(drag.startY, drag.currentY) * 100}%`,
                width: `${Math.abs(drag.currentX - drag.startX) * 100}%`,
                height: `${Math.abs(drag.currentY - drag.startY) * 100}%`,
                pointerEvents: "none",
              }}
            />
          )}

          <span className="absolute -bottom-5 left-0 text-xs text-gray-500">
            Page {page.index + 1}
            {page.isScanned ? " · OCR" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
