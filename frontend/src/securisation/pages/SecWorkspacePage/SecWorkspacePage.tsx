"use client";

import { CloudUpload, ShieldCheck, Shuffle } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { MineToggle } from "@/shared/components/dossier/MineToggle/MineToggle";
import { useAuth } from "@/shared/context/AuthContext";
import { useUrlCriteria } from "@/shared/hooks/useUrlCriteria";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import { SEC_SOURCES, SECURISATION_SECTIONS } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";

/**
 * Work space of the sécurisation team: Date | EPS | Délai | Équipe J-1 | Drapeaux | Pilote | global file |
 * Sécurisation (with the J-1 columns while the dossier is "Planifié") | sécurisation files 1-3.
 * A pilot sees his own dossiers first, the others greyed out (read only); the admin reassigns in one click.
 */
export function SecWorkspacePage({ canImport = false }: { canImport?: boolean }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN_SECURISATION";
  const isPilot = user?.role === "PILOTE_SECURISATION";
  const url = useUrlCriteria(tomorrow());

  const adminActions = canImport ? (
    <>
      <LinkButton href="/securisation/imports" variant="secondary" leftIcon={<CloudUpload />}>
        Importer
      </LinkButton>
      <LinkButton href="/securisation/dispatch" leftIcon={<Shuffle />}>
        Dispatcher
      </LinkButton>
    </>
  ) : undefined;

  return (
    <SuiviView
      gridId="sec-espace"
      eyebrow="Sécurisation"
      title={isPilot ? "Mes dossiers à sécuriser" : "Espace sécurisation"}
      description={
        isPilot
          ? "Vos dossiers en premier, ceux des autres pilotes en lecture seule. Quand « Cellule plani » n'est pas « Planifié », les colonnes J-1 passent à la planification."
          : "Dossiers du lendemain avec leurs drapeaux et leur pilote. Changez un pilote d'un clic, ou répartissez tout depuis le dispatch."
      }
      icon={<ShieldCheck />}
      key={url.key}
      initialDate={url.date}
      initialFilters={url.filters}
      sections={SECURISATION_SECTIONS}
      rawSources={SEC_SOURCES}
      rawHidden={false}
      teams={[{ team: "SECURISATION", editable: isAdmin }]}
      actions={adminActions}
      renderActions={isPilot && user ? (grid) => <MineToggle grid={grid} team="SECURISATION" username={user.username} /> : undefined}
      emptyAction={adminActions}
    />
  );
}
