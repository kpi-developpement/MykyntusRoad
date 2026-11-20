"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, FolderOpen, ShieldCheck, ShieldPlus, type LucideIcon } from "lucide-react";
import { KpiCard } from "../../components/card/KpiCard/KpiCard";
import { DossierDrawer } from "../../components/drawer/DossierDrawer/DossierDrawer";
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
import { secService } from "../../services/secService";
import { MAIN_SECTIONS, SECTION_LABELS, type ColumnFilter, type DataSource, type DossierRow, type FieldSection, type Pilote } from "../../types";
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
  /** "Pilote assigné" column (sécurisation). */
  withAssignee?: boolean;
  /** Pilots (names + reassignment), loaded only for the sécurisation admin. */
  pilotes?: Pilote[] | null;
  actions?: React.ReactNode;
  /** Header actions that need the table state (e.g. "Mes dossiers"). */
  renderActions?: (grid: DossierGrid) => React.ReactNode;
  emptyAction?: React.ReactNode;
}

const KPI: Record<FieldSection, { icon: LucideIcon; tone: "brand" | "sky" | "indigo" | "cyan" }> = {
  SECURISATION: { icon: ShieldPlus, tone: "cyan" },
  J_MINUS_1: { icon: ShieldCheck, tone: "brand" },
  J: { icon: CalendarClock, tone: "sky" },
  J_PLUS_1: { icon: ClipboardCheck, tone: "indigo" },
};

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 xl:grid-cols-4",
};

/** Dossier follow-up screen, shared by the admin and the pilots (sections and rights differ). */
const MAIN_ONLY: DataSource[] = ["MAIN"];
const NO_FILTERS: ColumnFilter[] = [];

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
  withAssignee = false,
  pilotes = null,
  actions,
  renderActions,
  emptyAction,
}: SuiviViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { flags } = useFlags();
  const { pendingSearch, clearPendingSearch } = useLayout();
  const grid = useDossierGrid({
    initialDate: pendingSearch ? "" : initialDate,
    initialSearch: pendingSearch?.q ?? "",
    initialFilters: pendingSearch ? NO_FILTERS : initialFilters,
  });
  const [details, setDetails] = useState<DossierRow | null>(null);
  const editable = useMemo(() => user?.editableSections ?? [], [user]);
  const { saveValue, applySearch, patchRow, refreshStats } = grid;
  const role = user?.role;
  const flagsEditable = role !== undefined && role !== "PILOTE_J";
  const assigneeEditable = role === "ADMIN_SECURISATION";

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
    async (row: DossierRow, pilote: string | null) => {
      try {
        await secService.assign([row.id], pilote);
        patchRow(row.id, { assignedTo: pilote });
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
    () => (withAssignee ? { pilotes, editable: assigneeEditable, onAssign: assign } : null),
    [withAssignee, pilotes, assigneeEditable, assign],
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
        assignee: assigneeOptions,
      }),
    [grid.data, sections, editable, rawSources, rawHidden, save, flagOptions, assigneeOptions],
  );
  const groups = useMemo(() => buildSuiviGroups(sections, editable, grid.stats, rawSources), [sections, editable, grid.stats, rawSources]);

  const total = grid.stats?.total ?? 0;
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

      <div className={`mb-5 grid gap-3 sm:gap-4 ${GRID_COLS[sections.length + 1] ?? GRID_COLS[4]}`}>
        <KpiCard
          label="Dossiers"
          value={total}
          icon={FolderOpen}
          tone="slate"
          hint={date ? `Pour le ${formatDateLong(date)}` : "Toutes les dates"}
          index={0}
        />
        {sections.map((section, i) => (
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

      <FlagStrip grid={grid} />

      <DossierGridPanel gridId={gridId} grid={grid} columns={columns} groups={groups} emptyAction={emptyAction} progressSections={sections} />

      <DossierDrawer
        row={details}
        columns={grid.data?.sourceColumns ?? []}
        fields={grid.data?.fields ?? []}
        onClose={() => setDetails(null)}
      />
    </>
  );
}
