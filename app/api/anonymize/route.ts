import { NextResponse } from "next/server";
import { buildAnonymizedPdf } from "@/lib/pdf-redact";
import type { AnonymizeZone } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  const zonesRaw = formData.get("zones");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier PDF reçu." }, { status: 400 });
  }
  if (typeof zonesRaw !== "string") {
    return NextResponse.json({ error: "Zones manquantes." }, { status: 400 });
  }

  let zones: AnonymizeZone[];
  try {
    zones = JSON.parse(zonesRaw);
    if (!Array.isArray(zones)) throw new Error("not an array");
  } catch {
    return NextResponse.json({ error: "Zones invalides." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const originalBytes = new Uint8Array(arrayBuffer);

    const anonymizedBytes = await buildAnonymizedPdf(originalBytes, zones);

    const baseName = file.name.replace(/\.pdf$/i, "");
    const downloadName = `${baseName}_anonymise.pdf`;

    return new NextResponse(Buffer.from(anonymizedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Erreur /api/anonymize:", err);
    return NextResponse.json(
      { error: "Impossible de générer le PDF anonymisé." },
      { status: 500 }
    );
  }
}
