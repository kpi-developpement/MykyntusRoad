import { Eye, Lock } from "lucide-react";
import type { DataSource, DossierRow, DossierStats, DossierTable, FieldSection } from "../../../types";
import { SECTION_LABELS, SECTIONS, SOURCE_LABELS } from "../../../types";
import { SECTION_THEME, sourceGroup } from "../../../utils/sectionTheme";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { ValuePicker } from "../../select/ValuePicker/ValuePicker";
import type { GridColumn, GridGroup } from "../DataGrid/types";
import { dateColumn, idColumn, isIdExterneColumn, rawColumn } from "./commonColumns";

interface SuiviColumnsOptions {
  data: DossierTable | null;
  /** Sections fully displayed. Other sections only show their published columns (read only). */
  sections: FieldSection[];
  editableSections: FieldSection[];
  /** Imported files whose (admin-visible) columns are offered. */
  rawSources: DataSource[];
  /** Imported columns hidden until the user shows them from the "Colonnes" menu. */
  rawHidden: boolean;
  onSave: (dossierId: number, fieldId: number, value: string | null) => Promise<void>;
  onOpen: (row: DossierRow) => void;
}

/**
 * Columns of a follow-up table: Date | ID Externe | imported columns | application columns
 * grouped by section (Sécurisation, J-1, J, J+1).
 */
export function buildSuiviColumns({ data, sections, editableSections, rawSources, rawHidden, onSave, onOpen }: SuiviColumnsOptions): GridColumn<DossierRow>[] {
  const columns: GridColumn<DossierRow>[] = [dateColumn(), idColumn(onOpen)];

  for (const sc of data?.sourceColumns ?? []) {
    if (rawSources.includes(sc.source) && !isIdExterneColumn(sc.label)) {
      columns.push(rawColumn(sc, { groupId: sourceGroup(sc.source), defaultHidden: rawHidden }));
    }
  }

  for (const section of SECTIONS) {
    const full = sections.includes(section);
    const fields = data?.fields.filter((f) => f.section === section && (full || f.published)) ?? [];
    for (const field of fields) {
      const select = field.type === "SELECT";
      columns.push({
        key: `field:${field.id}`,
        label: field.label,
        groupId: section,
        width: field.type === "TEXT" ? 220 : field.type === "DATE" ? 160 : 184,
        sortable: true,
        filterable: true,
        knownValues: select ? field.options.map((o) => o.value) : undefined,
        renderValue: select ? (v) => <ValueChip value={v} size="xs" /> : undefined,
        render: (row) => (
          <ValuePicker
            field={field}
            value={row.values[field.id]}
            editable={full && editableSections.includes(section)}
            onSave={(value) => onSave(row.id, field.id, value)}
          />
        ),
      });
    }
  }
  return columns;
}

/** Coloured header groups, with "treated / total" counters and read-only markers. */
export function buildSuiviGroups(
  sections: FieldSection[],
  editableSections: FieldSection[],
  stats: DossierStats | null,
  rawSources: DataSource[],
): GridGroup[] {
  const groups: GridGroup[] = rawSources.map((source) => {
    const id = sourceGroup(source);
    const title = source === "MAIN" ? "Données importées" : SOURCE_LABELS[source];
    return { id, title, label: title, headerClassName: SECTION_THEME[id].header, subHeaderClassName: SECTION_THEME[id].sub };
  });

  for (const section of SECTIONS) {
    const full = sections.includes(section);
    const stat = stats?.sections.find((s) => s.section === section);
    const editable = full && editableSections.includes(section);
    groups.push({
      id: section,
      title: SECTION_LABELS[section],
      headerClassName: SECTION_THEME[section].header,
      subHeaderClassName: SECTION_THEME[section].sub,
      label: (
        <span className="inline-flex items-center gap-2">
          {SECTION_LABELS[section]}
          {full && stat && stats && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-normal tabular-nums">
              {stat.treated}/{stats.total}
            </span>
          )}
          {!editable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-semibold tracking-normal normal-case">
              {full ? <Lock className="size-3" /> : <Eye className="size-3" />} lecture seule
            </span>
          )}
        </span>
      ),
    });
  }
  return groups;
}
