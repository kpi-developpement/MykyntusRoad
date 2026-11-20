import { CloudUpload, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { NavSection } from "@/shared/types/navigation";

export const SECURISATION_NAV: NavSection[] = [
  {
    title: "Sécurisation",
    items: [{ href: "/securisation/espace", label: "Espace sécurisation", icon: ShieldCheck, description: "Dossiers à sécuriser" }],
  },
  {
    title: "Administration",
    items: [
      { href: "/securisation/imports", label: "Fichiers sécurisation", icon: CloudUpload, description: "Importer les 3 fichiers" },
      { href: "/securisation/colonnes", label: "Colonnes & valeurs", icon: SlidersHorizontal, description: "Colonnes affichées, listes" },
    ],
  },
];
