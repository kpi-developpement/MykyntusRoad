"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, FolderOpen, ListChecks, ShieldPlus, Workflow, type LucideIcon } from "lucide-react";
import { KpiCard } from "../../components/card/KpiCard/KpiCard";
import { DossierDrawer } from "../../components/drawer/DossierDrawer/DossierDrawer";
import { DelayStrip } from "../../components/dossier/DelayStrip/DelayStrip";
import { JoinDossierModal, type JoinTarget } from "../../components/dossier/JoinDossierModal/JoinDossierModal";
import { SecuAlertBanner } from "../../components/feedback/SecuAlertBanner/SecuAlertBanner";
import { FlagStrip } from "../../components/flag/FlagStrip/FlagStrip";
import { PageHeader } from "../../components/layout/PageHeader/PageHeader";
import { DossierGridPanel } from "../../components/table/DossierGridPanel/DossierGridPanel";
import { buildSuiviColumns, buildSuiviGroups } from "../../components/table/DossierTable/suiviColumns";
import { useToast } from "../../components/toast/ToastProvider/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";
import { useDossierGrid, type DossierGrid } from "../../hooks/useDossierGrid";
import { dossierService } from "../../services/dossierService";
import { useTeamPilotes } from "../../hooks/useTeamPilotes";
import { teamService } from "../../services/teamService";
import {
  MAIN_SECTIONS,
  SECTION_LABELS,
  joinableTeam,
  teamOf,
  workersOf,
  type ColumnFilter,
  type DataSource,
  type DossierRow,
  type DossierWorkers,
  type FieldSection,
  type Team,
} from "../../types";
import { formatDateLong } from "../../utils/date";

interface SuiviViewProps {
  gridId: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  initialDate: string;
  initialFilters?: ColumnFilter[];
  /** Sections fully displayed (others only show their published columns, read only). */
  sections?: FieldSection[];
  /** Imported files whose columns are offered. */
  rawSources?: DataSource[];
  /** Imported columns hidden until shown from the "Colonnes" menu. */
  rawHidden?: boolean;
  /** "Pilote" columns shown (one per team); dispatch = the connected admin reassigns in one click. */
  teams?: { team: Team; dispatch?: boolean }[];
  /** Declares the dossiers whose sécurisation is still missing the day before the appointment. */
  secuAlert?: boolean;
  actions?: React.ReactNode;
  /** Header actions that need the table state (e.g. "Mes dossiers"). */
  renderActions?: (grid: DossierGrid) => React.ReactNode;
  /** Card shown above the counters (needs the table state). */
  renderBanner?: (grid: DossierGrid) => React.ReactNode;
  emptyAction?: React.ReactNode;
}

const KPI: Record<FieldSection, { icon: LucideIcon; tone: "blue" | "violet" | "emerald" | "fuchsia" }> = {
  SECURISATION: { icon: ShieldPlus, tone: "blue" },
  J_MINUS_1: { icon: ListChecks, tone: "violet" },
  PLANIFICATION: { icon: Workflow, tone: "violet" },
  J: { icon: CalendarClock, tone: "emerald" },
  J_PLUS_1: { icon: ClipboardCheck, tone: "fuchsia" },
};

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

/** Dossier follow-up screen, shared by the admins and the pilots (sections and rights differ). */
const MAIN_ONLY: DataSource[] = ["MAIN"];
const NO_FILTERS: ColumnFilter[] = [];
const NO_TEAMS: { team: Team; dispatch?: boolean }[] = [];

export function SuiviView({
  gridId,
  eyebrow,
  title,
  description,
  icon,
  initialDate,
  initialFilters = NO_FILTERS,
  sections = MAIN_SECTIONS,
  rawSources = MAIN_ONLY,
  rawHidden = true,
  teams = NO_TEAMS,
  secuAlert = false,
  actions,
  renderActions,
  renderBanner,
  emptyAction,
}: SuiviViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { pendingSearch, clearPendingSearch } = useLayout();
  // a pilot sees his own dossiers first; the others are read only until he joins them
  const ownTeam = teamOf(user?.role);
  const joinTeam = joinableTeam(user?.role);
  const username = user?.username ?? "";
  const grid = useDossierGrid({
    initialDate: pendingSearch ? "" : initialDate,
    initialSearch: pendingSearch?.q ?? "",
    initialFilters: pendingSearch ? NO_FILTERS : initialFilters,
    pin: ownTeam && username ? { team: ownTeam, username } : null,
  });
  const dispatchTeams = useMemo(() => teams.filter((t) => t.dispatch).map((t) => t.team), [teams]);
  const teamPilotes = useTeamPilotes(dispatchTeams);
  const [details, setDetails] = useState<DossierRow | null>(null);
  const [joining, setJoining] = useState<JoinTarget | null>(null);
  const editable = useMemo(() => user?.editableSections ?? [], [user]);
  const { saveValue, applySearch, patchRow, addNames, refreshStats } = grid;
  const role = user?.role;
  const flagsEditable = role === "ADMIN" || role === "ADMIN_SECURISATION" || role === "PILOTE_SECURISATION";
  const isMine = useCallback((row: DossierRow) => !ownTeam || workersOf(row, ownTeam).includes(username), [ownTeam, username]);
  const rowMuted = useMemo(() => (ownTeam ? (row: DossierRow) => !isMine(row) : undefined), [ownTeam, isMine]);
  const rowMine = useMemo(() => (ownTeam ? isMine : undefined), [ownTeam, isMine]);

  // search requested from the command palette (Ctrl + K)
  useEffect(() => {
    if (!pendingSearch) return;
    applySearch(pendingSearch.q);
    clearPendingSearch();
  }, [pendingSearch, applySearch, clearPendingSearch]);

  const save = useCallback(
    async (dossierId: number, fieldId: number, value: string | null) => {
      try {
        await saveValue(dossierId, fieldId, value);
      } catch (e) {
        toast.error("Enregistrement impossible", e instanceof Error ? e.message : undefined);
        throw e;
      }
    },
    [saveValue, toast],
  );

  const applyFlags = useCallback(
    async (row: DossierRow, codes: string[]) => {
      try {
        const res = await dossierService.setFlags(row.id, codes);
        patchRow(row.id, { flags: res.flags, flagsManual: res.manual });
        refreshStats();
      } catch (e) {
        toast.error("Drapeaux non enregistrés", e instanceof Error ? e.message : undefined);
        throw e;
      }
    },
    [patchRow, refreshStats, toast],
  );

  const resetFlags = useCallback(
    async (row: DossierRow) => {
      try {
        const res = await dossierService.resetFlags(row.id);
        patchRow(row.id, { flags: res.flags, flagsManual: res.manual });
        refreshStats();
        toast.info("Drapeaux automatiques rétablis", row.idExterne);
      } catch (e) {
        toast.error("Réinitialisation impossible", e instanceof Error ? e.message : undefined);
        throw e;
      }
    },
    [patchRow, refreshStats, toast],
  );

  const assign = useCallback(
    async (row: DossierRow, pilote: string | null, team: Team) => {
      try {
        await teamService.assign(team, [row.id], pilote);
        patchRow(row.id, team === "SECURISATION" ? { assignedTo: pilote } : { assignedJ: pilote });
        refreshStats();
      } catch (e) {
        toast.error("Attribution impossible", e instanceof Error ? e.message : undefined);
      }
    },
    [patchRow, refreshStats, toast],
  );

  /** After a take / join / leave: the pilots of the dossier, as the server sees them now. */
  const onJoinChanged = useCallback(
    (row: DossierRow, res: DossierWorkers) => {
      const others = res.workers.filter((w) => !w.lead).map((w) => w.username);
      patchRow(row.id, {
        ...(res.team === "SECURISATION" ? { assignedTo: res.lead } : { assignedJ: res.lead }),
        workers: { ...row.workers, [res.team]: others },
      });
      addNames(Object.fromEntries(res.workers.map((w) => [w.username, w.name])));
      refreshStats();
    },
    [patchRow, addNames, refreshStats],
  );

  const names = grid.data?.names;
  const nameOf = useCallback(
    (u: string) => names?.[u] ?? Object.values(teamPilotes).flat().find((p) => p?.username === u)?.fullName ?? u,
    [names, teamPilotes],
  );

  const flagOptions = useMemo(() => ({ editable: flagsEditable, onApply: applyFlags, onReset: resetFlags }), [flagsEditable, applyFlags, resetFlags]);
  const pilotOptions = useMemo(
    () =>
      teams.map((t) => ({
        team: t.team,
        nameOf,
        me: username,
        canJoin: joinTeam === t.team,
        onOpenJoin: (row: DossierRow, team: Team) => setJoining({ row, team }),
        dispatch: t.dispatch ? { pilotes: teamPilotes[t.team] ?? null, onAssign: assign } : null,
      })),
    [teams, nameOf, username, joinTeam, teamPilotes, assign],
  );

  const { filters, sort } = grid.criteria;
  const activeKeys = useMemo(() => new Set([...filters.map((f) => f.key), ...(sort ? [sort.key] : [])]), [filters, sort]);

  const columns = useMemo(
    () =>
      buildSuiviColumns({
        data: grid.data,
        sections,
        editableSections: editable,
        rawSources,
        rawHidden,
        onSave: save,
        onOpen: setDetails,
        flags: flagOptions,
        pilots: pilotOptions,
        canEditRow: ownTeam ? isMine : undefined,
        activeKeys,
      }),
    [grid.data, sections, editable, rawSources, rawHidden, save, flagOptions, pilotOptions, ownTeam, isMine, activeKeys],
  );
  const openCount = grid.data?.openCount ?? 0;
  const groups = useMemo(
    () => buildSuiviGroups(sections, editable, grid.stats, rawSources, openCount),
    [sections, editable, grid.stats, rawSources, openCount],
  );

  const total = grid.stats?.total ?? 0;
  const kpiSections = sections.filter((s) => s !== "PLANIFICATION");
  const date = grid.criteria.date;
  const mutedTitle =
    ownTeam === "J"
      ? "Prenez ou rejoignez ce dossier (colonne Pilote) pour le modifier"
      : "Dossier d'un autre pilote : rejoignez-le (colonne Pilote) pour le modifier";

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        icon={icon}
        actions={
          (actions || renderActions) && (
            <>
              {renderActions?.(grid)}
              {actions}
            </>
          )
        }
      />

      {renderBanner?.(grid)}
      {secuAlert && <SecuAlertBanner grid={grid} />}

      <div className={`mb-5 grid gap-3 sm:gap-4 ${GRID_COLS[kpiSections.length + 1] ?? GRID_COLS[4]}`}>
        <KpiCard
          label="Dossiers"
          value={total}
          icon={FolderOpen}
          tone="slate"
          hint={date ? `Pour le ${formatDateLong(date)}` : "Toutes les dates"}
          index={0}
        />
        {kpiSections.map((section, i) => (
          <KpiCard
            key={section}
            label={`${SECTION_LABELS[section]} traités`}
            value={grid.stats?.sections.find((s) => s.section === section)?.treated ?? 0}
            total={total}
            icon={KPI[section].icon}
            tone={KPI[section].tone}
            hint={section === "J_MINUS_1" ? "« Planifié » à l'import, ou colonnes ouvertes" : "Au moins une valeur saisie"}
            index={i + 1}
          />
        ))}
      </div>

      <DelayStrip grid={grid} />
      <FlagStrip grid={grid} />

      <DossierGridPanel
        gridId={gridId}
        grid={grid}
        columns={columns}
        groups={groups}
        emptyAction={emptyAction}
        progressSections={kpiSections}
        rowMuted={rowMuted}
        mutedTitle={mutedTitle}
        rowMine={rowMine}
      />

      <DossierDrawer
        row={details}
        columns={grid.data?.sourceColumns ?? []}
        fields={grid.data?.fields ?? []}
        onClose={() => setDetails(null)}
      />

      <JoinDossierModal
        target={joining}
        me={username}
        onClose={() => setJoining(null)}
        onChanged={onJoinChanged}
        onOpenLifecycle={(row) => {
          setJoining(null);
          setDetails(row);
        }}
      />
    </>
  );
}
