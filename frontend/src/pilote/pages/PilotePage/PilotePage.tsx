"use client";

import { CalendarClock } from "lucide-react";
import { SecWorkspacePage } from "@/securisation/pages/SecWorkspacePage/SecWorkspacePage";
import { MineToggle } from "@/shared/components/dossier/MineToggle/MineToggle";
import { useAuth } from "@/shared/context/AuthContext";
import { useUrlCriteria } from "@/shared/hooks/useUrlCriteria";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import type { FieldSection } from "@/shared/types";
import { today } from "@/shared/utils/date";

const J_SECTIONS: FieldSection[] = ["J_MINUS_1", "J", "J_PLUS_1"];

/**
 * Pilote sécurisation : the sécurisation space.
 * Pilote : every injected dossier is visible; he takes the ones he works on (column "Pilote", several
 * pilots may work the same dossier): Cellule plani and the J-1 columns it opens, J and J+1.
 */
export function PilotePage() {
  const { user } = useAuth();
  const url = useUrlCriteria(today());
  if (!user) return null;

  if (user.role === "PILOTE_SECURISATION") return <SecWorkspacePage />;

  return (
    <SuiviView
      gridId="pilote-j"
      eyebrow="Pilotage"
      title="Pilotage J-1 / J / J+1"
      description="Tous les dossiers injectés sont visibles. Cliquez sur « Prendre » (colonne Pilote) pour travailler un dossier, ou rejoignez un collègue déjà dessus. Vos dossiers d'abord."
      icon={<CalendarClock />}
      key={url.key}
      initialDate={url.date}
      initialFilters={url.filters}
      sections={J_SECTIONS}
      teams={[{ team: "J" }]}
      renderActions={(grid) => <MineToggle grid={grid} team="J" username={user.username} />}
    />
  );
}
