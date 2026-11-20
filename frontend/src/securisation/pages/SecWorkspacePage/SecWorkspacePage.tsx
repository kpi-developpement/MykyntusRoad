"use client";

import { useMemo } from "react";
import { CloudUpload, ShieldCheck, Shuffle, UserRound, UsersRound } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { SegmentedControl } from "@/shared/components/segmented/SegmentedControl/SegmentedControl";
import { useAuth } from "@/shared/context/AuthContext";
import type { DossierGrid } from "@/shared/hooks/useDossierGrid";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import { SEC_SOURCES, SECURISATION_SECTIONS, type ColumnFilter } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";
import { usePilotes } from "../../hooks/usePilotes";

/**
 * Work space of the sécurisation team: Date | EPS | Drapeaux | Pilote assigné | columns of the files |
 * Sécurisation (date, pilote, département, commentaire, état final) | J-1.
 * A pilot opens on his own dossiers (dispatch); the admin sees everybody and can reassign in one click.
 */
export function SecWorkspacePage({ canImport = false }: { canImport?: boolean }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN_SECURISATION";
  const isPilot = user?.role === "PILOTE_SECURISATION";
  const { pilotes } = usePilotes(isAdmin);

  const mine = useMemo<ColumnFilter[]>(() => (isPilot && user ? [{ key: "assignee", values: [user.username] }] : []), [isPilot, user]);

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

  const renderActions = isPilot && user ? (grid: DossierGrid) => <MineToggle grid={grid} username={user.username} /> : undefined;

  return (
    <SuiviView
      gridId="sec-espace"
      eyebrow="Sécurisation"
      title={isPilot ? "Mes dossiers à sécuriser" : "Espace sécurisation"}
      description={
        isPilot
          ? "Les dossiers qui vous sont attribués. Pilote et date de traitement se remplissent automatiquement ; les drapeaux indiquent les priorités."
          : "Dossiers du lendemain avec leurs drapeaux et leur pilote. Changez un pilote d'un clic, ou répartissez tout depuis le dispatch."
      }
      icon={<ShieldCheck />}
      initialDate={tomorrow()}
      initialFilters={mine}
      sections={SECURISATION_SECTIONS}
      rawSources={SEC_SOURCES}
      rawHidden={false}
      withAssignee
      pilotes={pilotes}
      actions={adminActions}
      renderActions={renderActions}
      emptyAction={adminActions}
    />
  );
}

/** "Mes dossiers" (dispatched to me) / "Toute l'équipe". */
function MineToggle({ grid, username }: { grid: DossierGrid; username: string }) {
  const filter = grid.criteria.filters.find((f) => f.key === "assignee");
  const value = filter?.values?.length === 1 && filter.values[0] === username ? "mine" : filter ? null : "all";
  return (
    <SegmentedControl
      ariaLabel="Dossiers affichés"
      value={value}
      onChange={(v) => grid.setFilter("assignee", v === "mine" ? { key: "assignee", values: [username] } : null)}
      options={[
        { value: "mine", label: "Mes dossiers", icon: UserRound },
        { value: "all", label: "Toute l'équipe", icon: UsersRound },
      ]}
    />
  );
}
