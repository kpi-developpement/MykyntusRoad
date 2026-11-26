"use client";

import { CloudUpload, LayoutDashboard } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import { useUrlCriteria } from "@/shared/hooks/useUrlCriteria";
import type { Team } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";

/** The admin works with the pilots: no dispatch, he can take / join a dossier like them. */
const TEAMS: { team: Team; dispatch?: boolean }[] = [{ team: "J" }];

export function SuiviPage() {
  const url = useUrlCriteria(tomorrow());
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
      description="J-1 / J / J+1 et l'état final de la sécurisation. Chaque dossier arrive « Planifié » : passez la Cellule plani à « Ouvert » pour ouvrir ses colonnes J-1. L'EPS passe en orange le J+1 au matin et en rouge après J+1 12h00 s'il n'est pas clôturé."
      icon={<LayoutDashboard />}
      key={url.key}
      initialDate={url.date}
      initialFilters={url.filters}
      teams={TEAMS}
      secuAlert
      actions={importButton}
      emptyAction={importButton}
    />
  );
}
