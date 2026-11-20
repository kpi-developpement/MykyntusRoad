import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/shared/components/providers/AppProviders/AppProviders";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const display = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "MyKyntus",
  description: "Suivi des dossiers - import et pilotage J-1 / J / J+1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-slate-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
