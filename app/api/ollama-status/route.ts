import { NextResponse } from "next/server";
import { getOllamaStatus } from "@/lib/ollama-detect";

export const runtime = "nodejs";
// Sans ça, Next.js prérend cette route au build (résultat figé pour
// toujours, ex: "indisponible" si Ollama ne tournait pas pendant le build) :
// il faut vérifier la disponibilité réelle à CHAQUE requête.
export const dynamic = "force-dynamic";

// Interrogé par l'interface au chargement pour savoir si un Ollama local
// répond (voir lib/ollama-detect.ts) — permet d'activer/désactiver la case
// "Améliorer la détection des noms via IA" avec un message pertinent selon
// le contexte (jamais disponible sur le déploiement Vercel, potentiellement
// disponible en usage local).
export async function GET() {
  const status = await getOllamaStatus();
  return NextResponse.json(status);
}
