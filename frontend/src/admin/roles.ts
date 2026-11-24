import { CalendarClock, Crown, ShieldCheck, ShieldPlus, Workflow, type LucideIcon } from "lucide-react";
import type { BadgeTone } from "@/shared/components/badge/Badge1/Badge1";
import type { Role } from "@/shared/types";

/** Presentation of each role in the admin screens. */
export const ROLE_INFO: Record<Role, { label: string; description: string; icon: LucideIcon; tone: BadgeTone; iconClass: string }> = {
  ADMIN: {
    label: "Administrateur",
    description: "Import principal, colonnes J / J+1, planification, dispatch des agents, utilisateurs. Sécurisation en lecture.",
    icon: Crown,
    tone: "brand",
    iconClass: "bg-brand-600 text-white",
  },
  ADMIN_SECURISATION: {
    label: "Admin sécurisation",
    description: "Les 3 fichiers sécurisation, les colonnes affichées et les valeurs de la sécurisation.",
    icon: ShieldPlus,
    tone: "sky",
    iconClass: "bg-cyan-600 text-white",
  },
  PILOTE_SECURISATION: {
    label: "Pilote sécurisation",
    description: "Travaille la veille : Sécurisation et colonnes J-1 des dossiers « Planifié », sur ses dossiers.",
    icon: ShieldCheck,
    tone: "sky",
    iconClass: "bg-sky-500 text-white",
  },
  PILOTE_PLANIFICATION: {
    label: "Agent planification",
    description: "Colonnes J-1 des dossiers non « Planifié », sur les dossiers que l'admin lui dispatche.",
    icon: Workflow,
    tone: "indigo",
    iconClass: "bg-violet-600 text-white",
  },
  PILOTE_J: {
    label: "Agent J / J+1",
    description: "Travaille le jour J : sections J et J+1 de ses dossiers, le reste en lecture.",
    icon: CalendarClock,
    tone: "indigo",
    iconClass: "bg-indigo-600 text-white",
  },
};

export const ROLES: Role[] = ["ADMIN", "ADMIN_SECURISATION", "PILOTE_SECURISATION", "PILOTE_PLANIFICATION", "PILOTE_J"];
