import type { DossierRow, SourceColumn } from "../../../types";
import { formatDate, weekdayShort } from "../../../utils/date";
import { IdCell } from "../../dossier/IdCell/IdCell";
import type { GridColumn } from "../DataGrid/types";

/** Column "Date" (dossier date). */
export function dateColumn(pinned = true): GridColumn<DossierRow> {
  return {
    key: "date",
    label: "Date",
    width: 138,
    pinned,
    sortable: true,
    filterable: true,
    formatValue: formatDate,
    renderValue: (v) => (
      <span className="tabular-nums">
        <span className="mr-1.5 text-[11px] font-semibold text-slate-400 uppercase">{weekdayShort(v)}</span>
        {formatDate(v)}
      </span>
    ),
    render: (row) => (
      <span className="block truncate pl-0.5 text-[13px] text-slate-700 tabular-nums">
        <span className="mr-1.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">{weekdayShort(row.date)}</span>
        {formatDate(row.date)}
      </span>
    ),
  };
}

/** Column "Ordre de travail : ID Externe": click = life cycle, hover 3 s = road map. */
export function idColumn(onOpen?: (row: DossierRow) => void): GridColumn<DossierRow> {
  return {
    key: "idExterne",
    label: "Ordre de travail : ID Externe",
    width: 214,
    pinned: true,
    sortable: true,
    filterable: true,
    render: (row) => <IdCell row={row} onOpen={onOpen} />,
  };
}

/** Column of an imported file (main or sécurisation). */
export function rawColumn(column: SourceColumn, options: { groupId?: string; defaultHidden?: boolean } = {}): GridColumn<DossierRow> {
  return {
    key: `raw:${column.name}`,
    label: column.label,
    groupId: options.groupId,
    defaultHidden: options.defaultHidden,
    width: Math.min(260, Math.max(150, column.label.length * 8 + 60)),
    sortable: true,
    filterable: true,
    render: (row) => {
      const value = row.raw[column.name];
      return value ? (
        <span className="block truncate px-1 text-[13px] text-slate-600" title={value}>
          {value}
        </span>
      ) : (
        <span className="px-1 text-slate-300">—</span>
      );
    },
  };
}

export const ID_EXTERNE_HEADER = "ordre de travail: id externe";

export function isIdExterneColumn(name: string): boolean {
  return name.trim().toLowerCase().replace(/\s+/g, " ") === ID_EXTERNE_HEADER;
}
