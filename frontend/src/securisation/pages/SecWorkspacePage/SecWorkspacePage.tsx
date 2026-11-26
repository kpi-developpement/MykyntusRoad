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
 * Work space of the sécurisation team: Date | EPS + drapeaux | Délai | Pilote | Sécurisation (up to
 * "Etat final", nothing of J-1) | global file | sécurisation files 1-3.
 * A pilot sees his own dossiers first; he can join a colleague's dossier; the admin reassigns in one click.
 * The day before the appointment, the dossiers still not secured are declared at the top.
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
          ? "Vos dossiers en premier. Pour aider un collègue, rejoignez son dossier depuis la colonne Pilote. Remplissez jusqu'à l'état final."
          : "Dossiers du lendemain avec leurs drapeaux et leur pilote. Changez un pilote d'un clic, ou répartissez tout depuis le dispatch."
      }
      icon={<ShieldCheck />}
      key={url.key}
      initialDate={url.date}
      initialFilters={url.filters}
      sections={SECURISATION_SECTIONS}
      rawSources={SEC_SOURCES}
      rawHidden={false}
      teams={[{ team: "SECURISATION", dispatch: isAdmin }]}
      secuAlert
      actions={adminActions}
      renderActions={isPilot && user ? (grid) => <MineToggle grid={grid} team="SECURISATION" username={user.username} /> : undefined}
      emptyAction={adminActions}
    />
  );
}
