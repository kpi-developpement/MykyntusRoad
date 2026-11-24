import { CloudUpload, Database, Files, Gauge, LayoutDashboard, Shuffle, SlidersHorizontal, Users, Workflow } from "lucide-react";
import type { NavSection } from "@/shared/types/navigation";

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/admin/dashboard", label: "Tableau de bord", icon: Gauge, description: "Vision globale, retards, calendrier" },
      { href: "/admin/suivi", label: "Suivi des dossiers", icon: LayoutDashboard, description: "Sécurisation / Planification / J / J+1" },
      { href: "/admin/planification", label: "Planification", icon: Workflow, description: "Dossiers non planifiés par la sécurisation" },
      { href: "/admin/dispatch", label: "Dispatch", icon: Shuffle, description: "Répartir entre les agents" },
    ],
  },
  {
    title: "Données",
    items: [
      { href: "/admin/import", label: "Import de fichier", icon: CloudUpload, description: "Importer un export Excel" },
      { href: "/admin/fichiers", label: "Fichiers injectés", icon: Files, description: "Historique, état, annulation" },
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
