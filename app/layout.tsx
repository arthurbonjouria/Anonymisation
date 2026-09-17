import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anonymisation PDF — Bonjour World",
  description: "Détection et anonymisation locale des données personnelles dans un PDF.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
