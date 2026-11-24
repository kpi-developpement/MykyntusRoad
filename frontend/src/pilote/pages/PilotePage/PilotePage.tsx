"use client";

import { CalendarClock, Workflow } from "lucide-react";
import { SecWorkspacePage } from "@/securisation/pages/SecWorkspacePage/SecWorkspacePage";
import { MineToggle } from "@/shared/components/dossier/MineToggle/MineToggle";
import { useAuth } from "@/shared/context/AuthContext";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import type { ColumnFilter, FieldSection } from "@/shared/types";
import { today, tomorrow } from "@/shared/utils/date";

const PLANIF_SECTIONS: FieldSection[] = ["PLANIFICATION"];
const PLANIF_FILTERS: ColumnFilter[] = [{ key: "route", values: ["PLANIFICATION"] }];
const J_SECTIONS: FieldSection[] = ["J", "J_PLUS_1"];

/**
 * Pilote sécurisation : the sécurisation space.
 * Agent planification : the J-1 columns of the dossiers that are not "Planifié".
 * Agent J / J+1 : today's dossiers (J and J+1 sections; the published sécurisation columns read only).
 * Every pilot sees his own dossiers first; the others are greyed out and read only.
 */
export function PilotePage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "PILOTE_SECURISATION") return <SecWorkspacePage />;

  if (user.role === "PILOTE_PLANIFICATION") {
    return (
      <SuiviView
        gridId="pilote-planif"
        eyebrow="Planification"
        title="Mes dossiers à planifier"
        description="Dossiers dont la « Cellule plani » n'est pas « Planifié » : leurs colonnes J-1 sont à vous. Vos dossiers en premier, les autres en lecture seule."
        icon={<Workflow />}
        initialDate={tomorrow()}
        initialFilters={PLANIF_FILTERS}
        sections={PLANIF_SECTIONS}
        teams={[{ team: "PLANIFICATION", editable: false }]}
        renderActions={(grid) => <MineToggle grid={grid} team="PLANIFICATION" username={user.username} />}
      />
    );
  }

  return (
    <SuiviView
      gridId="pilote-j"
      eyebrow="Pilotage"
      title="Pilotage J / J+1"
      description="Dossiers du jour. Vos dossiers en premier, ceux des autres agents en lecture seule. L'état final de la sécurisation est affiché en lecture seule."
      icon={<CalendarClock />}
      initialDate={today()}
      sections={J_SECTIONS}
      teams={[{ team: "J", editable: false }]}
      renderActions={(grid) => <MineToggle grid={grid} team="J" username={user.username} />}
    />
  );
}
