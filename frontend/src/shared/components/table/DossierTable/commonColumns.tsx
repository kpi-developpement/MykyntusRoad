"use client";

import { useFlags } from "../../../hooks/useFlags";
import type { DossierRow, Pilote, SourceColumn } from "../../../types";
import { formatDate, weekdayShort } from "../../../utils/date";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { AssigneeCell, piloteName } from "../../dossier/AssigneeCell/AssigneeCell";
import { IdCell } from "../../dossier/IdCell/IdCell";
import { FlagBadge } from "../../flag/FlagBadge/FlagBadge";
import { FlagCell } from "../../flag/FlagCell/FlagCell";
import type { GridColumn } from "../DataGrid/types";

function FlagValue({ code }: { code: string }) {
  const { byCode } = useFlags();
  return <FlagBadge code={code} flag={byCode.get(code)} withLabel />;
}

export interface FlagColumnOptions {
  editable: boolean;
  codes: string[];
  onApply: (row: DossierRow, codes: string[]) => Promise<void>;
  onReset: (row: DossierRow) => Promise<void>;
}

/** Column "Drapeaux": automatic flags, editable by hand, filterable. */
export function flagsColumn({ editable, codes, onApply, onReset }: FlagColumnOptions): GridColumn<DossierRow> {
  return {
    key: "flags",
    label: "Drapeaux",
    filterKind: "enum",
    width: 210,
    sortable: true,
    filterable: true,
    knownValues: codes,
    renderValue: (v) => <FlagValue code={v} />,
    render: (row) => <FlagCell row={row} editable={editable} onApply={onApply} onReset={onReset} />,
  };
}

export interface AssigneeColumnOptions {
  pilotes: Pilote[] | null;
  editable: boolean;
  onAssign: (row: DossierRow, pilote: string | null) => Promise<void>;
}

/** Column "Pilote assigné" (dispatch). */
export function assigneeColumn({ pilotes, editable, onAssign }: AssigneeColumnOptions): GridColumn<DossierRow> {
  return {
    key: "assignee",
    label: "Pilote assigné",
    filterKind: "enum",
    width: 190,
    sortable: true,
    filterable: true,
    formatValue: (v) => piloteName(v, pilotes),
    renderValue: (v) => (
      <span className="inline-flex items-center gap-1.5">
        <Avatar1 name={piloteName(v, pilotes)} size="sm" className="size-5 text-[8px]" />
        {piloteName(v, pilotes)}
      </span>
    ),
    render: (row) => <AssigneeCell row={row} pilotes={pilotes} editable={editable} onAssign={onAssign} />,
  };
}

/** Column "Date" (dossier date). */
export function dateColumn(pinned = true): GridColumn<DossierRow> {
  return {
    key: "date",
    label: "Date",
    filterKind: "date",
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
    filterKind: looksLikeDate(column.label) ? "date" : "text",
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

/** Imported columns holding dates ("Début planifié", "Date de RDV"...) get the date range filter. */
function looksLikeDate(label: string): boolean {
  const l = label.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return /\b(date|debut|fin|heure|planifi|cree|creation|echeance|rdv|jour)/.test(l);
}

export const ID_EXTERNE_HEADER = "ordre de travail: id externe";

export function isIdExterneColumn(name: string): boolean {
  return name.trim().toLowerCase().replace(/\s+/g, " ") === ID_EXTERNE_HEADER;
}
