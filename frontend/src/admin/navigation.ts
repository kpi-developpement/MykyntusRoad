import { CloudUpload, Database, LayoutDashboard, SlidersHorizontal, Users } from "lucide-react";
import type { NavSection } from "@/shared/types/navigation";

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [{ href: "/admin/suivi", label: "Suivi des dossiers", icon: LayoutDashboard, description: "Tableau J-1 / J / J+1" }],
  },
  {
    title: "Données",
    items: [
      { href: "/admin/import", label: "Import de fichier", icon: CloudUpload, description: "Importer un export Excel" },
      { href: "/admin/donnees", label: "Données importées", icon: Database, description: "Toutes les colonnes des fichiers" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/champs", label: "Colonnes & valeurs", icon: SlidersHorizontal, description: "Listes déroulantes de l'application" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, description: "Comptes et rôles" },
    ],
  },
];
