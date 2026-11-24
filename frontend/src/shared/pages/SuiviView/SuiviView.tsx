"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, FolderOpen, ShieldCheck, ShieldPlus, Workflow, type LucideIcon } from "lucide-react";
import { KpiCard } from "../../components/card/KpiCard/KpiCard";
import { DossierDrawer } from "../../components/drawer/DossierDrawer/DossierDrawer";
import { DelayStrip } from "../../components/dossier/DelayStrip/DelayStrip";
import { FlagStrip } from "../../components/flag/FlagStrip/FlagStrip";
import { PageHeader } from "../../components/layout/PageHeader/PageHeader";
import { DossierGridPanel } from "../../components/table/DossierGridPanel/DossierGridPanel";
import { buildSuiviColumns, buildSuiviGroups } from "../../components/table/DossierTable/suiviColumns";
import { useToast } from "../../components/toast/ToastProvider/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";
import { useDossierGrid, type DossierGrid } from "../../hooks/useDossierGrid";
import { useFlags } from "../../hooks/useFlags";
import { dossierService } from "../../services/dossierService";
import { useTeamPilotes } from "../../hooks/useTeamPilotes";
import { teamService } from "../../services/teamService";
import {
  MAIN_SECTIONS,
  SECTION_LABELS,
  assigneeOf,
  teamOf,
  type ColumnFilter,
  type DataSource,
  type DossierRow,
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
  /** Assignment columns shown (one per team) and whether the connected admin changes them. */
  teams?: { team: Team; editable: boolean }[];
  actions?: React.ReactNode;
  /** Header actions that need the table state (e.g. "Mes dossiers"). */
  renderActions?: (grid: DossierGrid) => React.ReactNode;
  /** Card shown above the counters (needs the table state, e.g. dossiers to plan). */
  renderBanner?: (grid: DossierGrid) => React.ReactNode;
  emptyAction?: React.ReactNode;
}

const KPI: Record<FieldSection, { icon: LucideIcon; tone: "blue" | "violet" | "emerald" | "fuchsia" }> = {
  SECURISATION: { icon: ShieldPlus, tone: "blue" },
  J_MINUS_1: { icon: ShieldCheck, tone: "blue" },
  PLANIFICATION: { icon: Workflow, tone: "violet" },
  J: { icon: CalendarClock, tone: "emerald" },
  J_PLUS_1: { icon: ClipboardCheck, tone: "fuchsia" },
};

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
};

/** Dossier follow-up screen, shared by the admin and the pilots (sections and rights differ). */
const MAIN_ONLY: DataSource[] = ["MAIN"];
const NO_FILTERS: ColumnFilter[] = [];
const NO_TEAMS: { team: Team; editable: boolean }[] = [];

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
  actions,
  renderActions,
  renderBanner,
  emptyAction,
}: SuiviViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { flags } = useFlags();
  const { pendingSearch, clearPendingSearch } = useLayout();
  // a pilot sees his own dossiers first, the others greyed out and read only
  const ownTeam = teamOf(user?.role);
  const username = user?.username ?? "";
  const grid = useDossierGrid({
    initialDate: pendingSearch ? "" : initialDate,
    initialSearch: pendingSearch?.q ?? "",
    initialFilters: pendingSearch ? NO_FILTERS : initialFilters,
    pin: ownTeam && username ? { team: ownTeam, username } : null,
  });
  const teamPilotes = useTeamPilotes(teams.map((t) => t.team));
  const [details, setDetails] = useState<DossierRow | null>(null);
  const editable = useMemo(() => user?.editableSections ?? [], [user]);
  const { saveValue, applySearch, patchRow, refreshStats } = grid;
  const role = user?.role;
  const flagsEditable = role === "ADMIN" || role === "ADMIN_SECURISATION" || role === "PILOTE_SECURISATION";
  const isMine = useCallback((row: DossierRow) => !ownTeam || assigneeOf(row, ownTeam) === username, [ownTeam, username]);
  const rowMuted = useMemo(() => (ownTeam ? (row: DossierRow) => !isMine(row) : undefined), [ownTeam, isMine]);

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
        patchRow(row.id, team === "SECURISATION" ? { assignedTo: pilote } : team === "PLANIFICATION" ? { assignedPlanif: pilote } : { assignedJ: pilote });
        refreshStats();
      } catch (e) {
        toast.error("Attribution impossible", e instanceof Error ? e.message : undefined);
      }
    },
    [patchRow, refreshStats, toast],
  );

  const flagCodes = useMemo(() => flags.map((f) => f.code), [flags]);
  const flagOptions = useMemo(
    () => ({ editable: flagsEditable, codes: flagCodes, onApply: applyFlags, onReset: resetFlags }),
    [flagsEditable, flagCodes, applyFlags, resetFlags],
  );
  const assigneeOptions = useMemo(
    () => teams.map((t) => ({ team: t.team, pilotes: teamPilotes[t.team] ?? null, editable: t.editable, onAssign: assign })),
    [teams, teamPilotes, assign],
  );

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
        assignees: assigneeOptions,
        canEditRow: ownTeam ? isMine : undefined,
      }),
    [grid.data, sections, editable, rawSources, rawHidden, save, flagOptions, assigneeOptions, ownTeam, isMine],
  );
  const groups = useMemo(() => buildSuiviGroups(sections, editable, grid.stats, rawSources), [sections, editable, grid.stats, rawSources]);

  const total = grid.stats?.total ?? 0;
  // the planification section has no column of its own: no counter
  const kpiSections = sections.filter((s) => s !== "PLANIFICATION");
  const date = grid.criteria.date;

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
            hint="Au moins une valeur saisie"
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
      />

      <DossierDrawer
        row={details}
        columns={grid.data?.sourceColumns ?? []}
        fields={grid.data?.fields ?? []}
        onClose={() => setDetails(null)}
      />
    </>
  );
}
