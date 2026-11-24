import { Eye, Lock } from "lucide-react";
import type { AppField, DataSource, DossierRow, DossierStats, DossierTable, FieldSection } from "../../../types";
import { SECTION_LABELS, SECTIONS, SOURCE_LABELS } from "../../../types";
import { SECTION_THEME, sourceGroup } from "../../../utils/sectionTheme";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { ValuePicker } from "../../select/ValuePicker/ValuePicker";
import type { GridColumn, GridGroup } from "../DataGrid/types";
import {
  assigneeColumn,
  dateColumn,
  delayColumn,
  flagsColumn,
  idColumn,
  isIdExterneColumn,
  rawColumn,
  routeColumn,
  type AssigneeColumnOptions,
  type FlagColumnOptions,
} from "./commonColumns";

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
  /** "Drapeaux" column. */
  flags?: FlagColumnOptions | null;
  /** Assignment columns (one per team shown). */
  assignees?: AssigneeColumnOptions[];
  /** A pilot only edits the dossiers dispatched to him: the others stay read only. */
  canEditRow?: (row: DossierRow) => boolean;
}

/** The 3 sécurisation files come last, after the work columns. */
const LAST_SOURCES: DataSource[] = ["SEC_1", "SEC_2", "SEC_3"];

/** Section a column belongs to for this dossier: a J-1 column goes to Planification when the dossier is not "Planifié". */
export function effectiveSection(field: AppField, row: DossierRow): FieldSection {
  return field.planification && row.planification ? "PLANIFICATION" : field.section;
}

/** Columns of a header group. */
function groupFields(data: DossierTable | null, section: FieldSection, sections: FieldSection[]): AppField[] {
  const fields = data?.fields ?? [];
  const full = sections.includes(section);
  if (section === "PLANIFICATION") return full ? fields.filter((f) => f.planification) : [];
  if (section === "SECURISATION") {
    // J-1 columns stay with Sécurisation unless the screen shows a Planification group
    return fields.filter((f) => f.section === section && (full ? !(f.planification && sections.includes("PLANIFICATION")) : f.published && !f.planification));
  }
  return fields.filter((f) => f.section === section && (full || f.published));
}

/**
 * Columns of a follow-up table: Date | ID Externe | Délai | Drapeaux | assignments | imported columns |
 * application columns grouped by service (Sécurisation, Planification, J, J+1) | sécurisation files 1-3.
 */
export function buildSuiviColumns({
  data,
  sections,
  editableSections,
  rawSources,
  rawHidden,
  onSave,
  onOpen,
  flags,
  assignees = [],
  canEditRow,
}: SuiviColumnsOptions): GridColumn<DossierRow>[] {
  const columns: GridColumn<DossierRow>[] = [dateColumn(), idColumn(onOpen), delayColumn()];
  if (sections.includes("PLANIFICATION") || sections.includes("SECURISATION")) columns.push(routeColumn());
  if (flags) columns.push(flagsColumn(flags));
  for (const a of assignees) columns.push(assigneeColumn(a));

  const raw = (sources: DataSource[]) => {
    for (const sc of data?.sourceColumns ?? []) {
      if (rawSources.includes(sc.source) && sources.includes(sc.source) && !isIdExterneColumn(sc.label)) {
        columns.push(rawColumn(sc, { groupId: sourceGroup(sc.source), defaultHidden: rawHidden }));
      }
    }
  };
  raw(rawSources.filter((s) => !LAST_SOURCES.includes(s)));

  for (const section of SECTIONS) {
    const full = sections.includes(section);
    for (const field of groupFields(data, section, sections)) {
      const select = field.type === "SELECT";
      columns.push({
        key: `field:${field.id}`,
        label: field.label,
        groupId: section,
        filterKind: field.type === "DATE" ? "date" : select ? "enum" : "text",
        width: field.type === "TEXT" ? 220 : field.type === "DATE" ? 160 : 184,
        sortable: true,
        filterable: true,
        knownValues: select ? field.options.map((o) => o.value) : undefined,
        renderValue: select ? (v) => <ValueChip value={v} size="xs" /> : undefined,
        render: (row) => (
          <ValuePicker
            field={field}
            value={row.values[field.id]}
            editable={full && editableSections.includes(effectiveSection(field, row)) && (canEditRow?.(row) ?? true)}
            onSave={(value) => onSave(row.id, field.id, value)}
          />
        ),
      });
    }
  }

  raw(LAST_SOURCES);
  return columns;
}

/** Coloured header groups, with "treated / total" counters and read-only markers. */
export function buildSuiviGroups(
  sections: FieldSection[],
  editableSections: FieldSection[],
  stats: DossierStats | null,
  rawSources: DataSource[],
): GridGroup[] {
  const source = (s: DataSource): GridGroup => {
    const id = sourceGroup(s);
    const title = s === "MAIN" ? "Données importées" : SOURCE_LABELS[s];
    return { id, title, label: title, headerClassName: SECTION_THEME[id].header, subHeaderClassName: SECTION_THEME[id].sub };
  };
  const groups: GridGroup[] = rawSources.filter((s) => !LAST_SOURCES.includes(s)).map(source);

  for (const section of SECTIONS) {
    if (section === "PLANIFICATION" && !sections.includes(section)) continue;
    const full = sections.includes(section);
    const stat = section === "PLANIFICATION" ? undefined : stats?.sections.find((s) => s.section === section);
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

  groups.push(...rawSources.filter((s) => LAST_SOURCES.includes(s)).map(source));
  return groups;
}
