import { CalendarClock, Crown, ShieldCheck, ShieldPlus, type LucideIcon } from "lucide-react";
import type { BadgeTone } from "@/shared/components/badge/Badge1/Badge1";
import type { Role } from "@/shared/types";

/** Presentation of each role in the admin screens. */
export const ROLE_INFO: Record<Role, { label: string; description: string; icon: LucideIcon; tone: BadgeTone; iconClass: string }> = {
  ADMIN: {
    label: "Administrateur",
    description: "Import principal, colonnes J-1 / J / J+1, utilisateurs. Sécurisation en lecture.",
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
    description: "Travaille la veille : sections Sécurisation et J-1.",
    icon: ShieldCheck,
    tone: "sky",
    iconClass: "bg-sky-500 text-white",
  },
  PILOTE_J: {
    label: "Pilote J / J+1",
    description: "Travaille le jour J : sections J et J+1, le reste en lecture.",
    icon: CalendarClock,
    tone: "indigo",
    iconClass: "bg-indigo-600 text-white",
  },
};

export const ROLES: Role[] = ["ADMIN", "ADMIN_SECURISATION", "PILOTE_SECURISATION", "PILOTE_J"];
