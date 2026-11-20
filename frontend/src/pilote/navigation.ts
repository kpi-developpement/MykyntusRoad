import { ClipboardCheck } from "lucide-react";
import type { NavSection } from "@/shared/types/navigation";

export const PILOTE_NAV: NavSection[] = [
  {
    title: "Pilotage",
    items: [{ href: "/pilote", label: "Mes dossiers", icon: ClipboardCheck, description: "Dossiers à traiter" }],
  },
];
