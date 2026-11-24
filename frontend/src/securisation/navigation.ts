import { CloudUpload, Files, Gauge, ShieldCheck, Shuffle, SlidersHorizontal, UsersRound } from "lucide-react";
import type { NavSection } from "@/shared/types/navigation";

export const SECURISATION_NAV: NavSection[] = [
  {
    title: "Sécurisation",
    items: [
      { href: "/securisation/dashboard", label: "Tableau de bord", icon: Gauge, description: "Vision globale, retards, calendrier" },
      { href: "/securisation/espace", label: "Espace sécurisation", icon: ShieldCheck, description: "Dossiers à sécuriser" },
      { href: "/securisation/dispatch", label: "Dispatch", icon: Shuffle, description: "Répartir le travail entre les pilotes" },
    ],
  },
  {
    title: "Équipe",
    items: [{ href: "/securisation/pilotes", label: "Pilotes", icon: UsersRound, description: "Créer et gérer les pilotes" }],
  },
  {
    title: "Administration",
    items: [
      { href: "/securisation/imports", label: "Fichiers sécurisation", icon: CloudUpload, description: "Fichier global + 3 fichiers" },
      { href: "/securisation/fichiers", label: "Fichiers injectés", icon: Files, description: "Historique, état, annulation" },
      { href: "/securisation/colonnes", label: "Colonnes & valeurs", icon: SlidersHorizontal, description: "Colonnes affichées, listes" },
    ],
  },
];
