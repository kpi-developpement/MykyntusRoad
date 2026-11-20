"use client";

import { CalendarClock } from "lucide-react";
import { SecWorkspacePage } from "@/securisation/pages/SecWorkspacePage/SecWorkspacePage";
import { useAuth } from "@/shared/context/AuthContext";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import { today } from "@/shared/utils/date";

/**
 * Pilote sécurisation : the sécurisation space (tomorrow's dossiers, Sécurisation + J-1).
 * Pilote J : today's dossiers (J and J+1 sections; J-1 and the published sécurisation columns read only).
 */
export function PilotePage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "PILOTE_SECURISATION") return <SecWorkspacePage />;

  return (
    <SuiviView
      gridId="pilote-j"
      eyebrow="Pilotage"
      title="Pilotage J / J+1"
      description="Dossiers du jour. J-1 et l'état final de la sécurisation sont affichés en lecture seule."
      icon={<CalendarClock />}
      initialDate={today()}
    />
  );
}
