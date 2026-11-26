import { Eye, FolderOpen, Lock } from "lucide-react";
import type { AppField, DataSource, DossierRow, DossierStats, DossierTable, FieldSection } from "../../../types";
import { SECTION_LABELS, SECTIONS, SOURCE_LABELS } from "../../../types";
import { SECTION_THEME, sourceGroup } from "../../../utils/sectionTheme";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { ValuePicker } from "../../select/ValuePicker/ValuePicker";
import type { GridColumn, GridGroup } from "../DataGrid/types";
import {
  dateColumn,
  delayColumn,
  idColumn,
  isIdExterneColumn,
  pilotsColumn,
  rawColumn,
  type FlagColumnOptions,
  type PilotColumnOptions,
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
  /** Flags attached to the ID Externe. */
  flags?: FlagColumnOptions | null;
  /** "Pilote" columns (one per team shown). */
  pilots?: PilotColumnOptions[];
  /** A pilot only edits the dossiers he works on: the others stay read only. */
  canEditRow?: (row: DossierRow) => boolean;
  /** Column keys with an active filter / sort: kept even when they would be hidden. */
  activeKeys?: Set<string>;
}

/** The 3 sécurisation files come last, after the work columns. */
const LAST_SOURCES: DataSource[] = ["SEC_1", "SEC_2", "SEC_3"];

/** Columns of a header group. */
function groupFields(data: DossierTable | null, section: FieldSection, sections: FieldSection[]): AppField[] {
  const fields = data?.fields ?? [];
  const full = sections.includes(section);
  return fields.filter((f) => f.section === section && (full || f.published));
}

/**
 * The conditional J-1 columns (Commentaire, Mail / Teams, Mail and their "Objet") only exist for the
 * dossiers whose Cellule plani was set to "Ouvert": hidden as long as no dossier of the table is open.
 */
export function hasOpenDossiers(data: DossierTable | null): boolean {
  return (data?.openCount ?? 0) > 0 || (data?.rows.content ?? []).some((r) => r.planification);
}

/**
 * Columns of a follow-up table: Date | ID Externe + drapeaux | Délai | Pilote(s) |
 * application columns grouped by service (Sécurisation, J-1, J, J+1) | imported columns | sécurisation files 1-3.
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
  pilots = [],
  canEditRow,
  activeKeys,
}: SuiviColumnsOptions): GridColumn<DossierRow>[] {
  const columns: GridColumn<DossierRow>[] = [dateColumn(), idColumn(onOpen, flags), delayColumn()];
  for (const p of pilots) columns.push(pilotsColumn(p));
  const open = hasOpenDossiers(data);

  const raw = (sources: DataSource[]) => {
    for (const sc of data?.sourceColumns ?? []) {
      if (rawSources.includes(sc.source) && sources.includes(sc.source) && !isIdExterneColumn(sc.label)) {
        columns.push(rawColumn(sc, { groupId: sourceGroup(sc.source), defaultHidden: rawHidden }));
      }
    }
  };
  // work columns first (right after the pilot), the imported data after them
  for (const section of SECTIONS) {
    const full = sections.includes(section);
    for (const field of groupFields(data, section, sections)) {
      const key = `field:${field.id}`;
      // conditional J-1 column: only once a dossier is "Ouvert" (or while it is filtered / sorted)
      if (field.planification && !open && !activeKeys?.has(key)) continue;
      const select = field.type === "SELECT";
      columns.push({
        key,
        label: field.label,
        groupId: section,
        filterKind: field.type === "DATE" ? "date" : select ? "enum" : "text",
        width: field.type === "TEXT" ? 220 : field.type === "DATE" ? 160 : 184,
        sortable: true,
        filterable: true,
        knownValues: select ? field.options.map((o) => o.value) : undefined,
        renderValue: select ? (v) => <ValueChip value={v} size="xs" /> : undefined,
        render: (row) =>
          field.planification && !row.planification ? (
            // closed for this dossier: Cellule plani is "Planifié"
            <span
              className="flex h-8 items-center px-1.5"
              title="Cellule plani « Planifié » : passez-la à « Ouvert » pour remplir cette colonne"
            >
              <span className="h-px w-5 rounded-full bg-slate-200" />
            </span>
          ) : (
            <ValuePicker
              field={field}
              value={row.values[field.id]}
              editable={full && !field.auto && editableSections.includes(section) && (canEditRow?.(row) ?? true)}
              onSave={(value) => onSave(row.id, field.id, value)}
            />
          ),
      });
    }
  }

  raw(rawSources.filter((s) => !LAST_SOURCES.includes(s)));
  raw(LAST_SOURCES);
  return columns;
}

/** Coloured header groups, with "treated / total" counters and read-only markers. */
export function buildSuiviGroups(
  sections: FieldSection[],
  editableSections: FieldSection[],
  stats: DossierStats | null,
  rawSources: DataSource[],
  openCount = 0,
): GridGroup[] {
  const source = (s: DataSource): GridGroup => {
    const id = sourceGroup(s);
    const title = s === "MAIN" ? "Données importées" : SOURCE_LABELS[s];
    return { id, title, label: title, headerClassName: SECTION_THEME[id].header, subHeaderClassName: SECTION_THEME[id].sub };
  };
  const groups: GridGroup[] = [];

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
          {section === "J_MINUS_1" && full && openCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold tracking-normal normal-case"
              title="Dossiers dont la Cellule plani est « Ouvert »"
            >
              <FolderOpen className="size-3" /> {openCount} ouvert{openCount > 1 ? "s" : ""}
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

  groups.push(...rawSources.filter((s) => !LAST_SOURCES.includes(s)).map(source));
  groups.push(...rawSources.filter((s) => LAST_SOURCES.includes(s)).map(source));
  return groups;
}
