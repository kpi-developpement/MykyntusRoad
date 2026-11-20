"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, FolderOpen, ShieldCheck, ShieldPlus, type LucideIcon } from "lucide-react";
import { KpiCard } from "../../components/card/KpiCard/KpiCard";
import { DossierDrawer } from "../../components/drawer/DossierDrawer/DossierDrawer";
import { PageHeader } from "../../components/layout/PageHeader/PageHeader";
import { DossierGridPanel } from "../../components/table/DossierGridPanel/DossierGridPanel";
import { buildSuiviColumns, buildSuiviGroups } from "../../components/table/DossierTable/suiviColumns";
import { useToast } from "../../components/toast/ToastProvider/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";
import { useDossierGrid } from "../../hooks/useDossierGrid";
import { MAIN_SECTIONS, SECTION_LABELS, type DataSource, type DossierRow, type FieldSection } from "../../types";
import { formatDateLong } from "../../utils/date";

interface SuiviViewProps {
  gridId: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  initialDate: string;
  /** Sections fully displayed (others only show their published columns, read only). */
  sections?: FieldSection[];
  /** Imported files whose columns are offered. */
  rawSources?: DataSource[];
  /** Imported columns hidden until shown from the "Colonnes" menu. */
  rawHidden?: boolean;
  actions?: React.ReactNode;
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

export function SuiviView({
  gridId,
  eyebrow,
  title,
  description,
  icon,
  initialDate,
  sections = MAIN_SECTIONS,
  rawSources = MAIN_ONLY,
  rawHidden = true,
  actions,
  emptyAction,
}: SuiviViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { pendingSearch, clearPendingSearch } = useLayout();
  const grid = useDossierGrid({
    initialDate: pendingSearch ? "" : initialDate,
    initialSearch: pendingSearch?.q ?? "",
  });
  const [details, setDetails] = useState<DossierRow | null>(null);
  const editable = useMemo(() => user?.editableSections ?? [], [user]);
  const { saveValue, applySearch } = grid;

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

  const columns = useMemo(
    () => buildSuiviColumns({ data: grid.data, sections, editableSections: editable, rawSources, rawHidden, onSave: save, onOpen: setDetails }),
    [grid.data, sections, editable, rawSources, rawHidden, save],
  );
  const groups = useMemo(() => buildSuiviGroups(sections, editable, grid.stats, rawSources), [sections, editable, grid.stats, rawSources]);

  const total = grid.stats?.total ?? 0;
  const date = grid.criteria.date;

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} icon={icon} actions={actions} />

      <div className={`mb-6 grid gap-3 sm:gap-4 ${GRID_COLS[sections.length + 1] ?? GRID_COLS[4]}`}>
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

      <DossierGridPanel gridId={gridId} grid={grid} columns={columns} groups={groups} emptyAction={emptyAction} />

      <DossierDrawer
        row={details}
        columns={grid.data?.sourceColumns ?? []}
        fields={grid.data?.fields ?? []}
        onClose={() => setDetails(null)}
      />
    </>
  );
}
