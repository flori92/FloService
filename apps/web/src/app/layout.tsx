import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: {
    template: "%s | FloService",
    default: "FloService | Trouvez le prestataire ideal pres de chez vous",
  },
  description:
    "La plateforme de reference pour trouver des prestataires de confiance pres de chez vous. Bricolage, menage, informatique et plus de 50 categories de services.",
  keywords: ["prestataire", "services", "bricolage", "menage", "Afrique", "Togo", "freelance"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "FloService",
    title: "FloService | Trouvez le prestataire ideal pres de chez vous",
    description: "Plus de 10 000 professionnels de confiance prets a vous aider.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} bg-white`}>
      <body className="font-sans text-slate-900 bg-white min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
