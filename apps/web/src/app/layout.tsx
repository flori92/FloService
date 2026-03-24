import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FloService | Trouvez le prestataire idéal près de chez vous",
  description: "Plateforme de mise en relation entre particuliers et professionnels pour vos services du quotidien : bricolage, ménage, informatique, etc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="bg-white">
      <body className={`${inter.className} text-slate-900 bg-slate-50 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
