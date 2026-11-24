"use client";

import { CloudUpload, LayoutDashboard } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import type { Team } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";

const TEAMS: { team: Team; editable: boolean }[] = [
  { team: "PLANIFICATION", editable: true },
  { team: "J", editable: true },
];

export function SuiviPage() {
  const importButton = (
    <LinkButton href="/admin/import" leftIcon={<CloudUpload />}>
      Importer un fichier
    </LinkButton>
  );
  return (
    <SuiviView
      gridId="admin-suivi"
      eyebrow="Pilotage"
      title="Suivi des dossiers"
      description="Vue complète Sécurisation / Planification / J / J+1. L'EPS passe en orange le J+1 au matin et en rouge après J+1 12h00 s'il n'est pas clôturé."
      icon={<LayoutDashboard />}
      initialDate={tomorrow()}
      teams={TEAMS}
      actions={importButton}
      emptyAction={importButton}
    />
  );
}
