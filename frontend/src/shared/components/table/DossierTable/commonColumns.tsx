"use client";

import { useFlags } from "../../../hooks/useFlags";
import { DELAY_LABELS, TEAM_LABELS, assigneeKey, assigneeOf, type Delay, type DossierRow, type Pilote, type SourceColumn, type Team } from "../../../types";
import { DelayBadge } from "../../dossier/DelayBadge/DelayBadge";
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
  /** Team whose assignment is shown (default: sécurisation). */
  team?: Team;
  pilotes: Pilote[] | null;
  editable: boolean;
  onAssign: (row: DossierRow, pilote: string | null, team: Team) => Promise<void>;
}

/** Column "Pilote sécurisation" / "Agent planification" / "Agent J / J+1" (dispatch). */
export function assigneeColumn({ team = "SECURISATION", pilotes, editable, onAssign }: AssigneeColumnOptions): GridColumn<DossierRow> {
  return {
    key: assigneeKey(team),
    label: TEAM_LABELS[team],
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
    render: (row) => (
      <AssigneeCell
        assignee={assigneeOf(row, team)}
        pilotes={pilotes}
        editable={editable}
        onAssign={(pilote) => onAssign(row, pilote, team)}
      />
    ),
  };
}

const DELAYS: Delay[] = ["LATE", "SOON", "ON_TIME", "DONE"];

/** Column "Délai": red after J+1 12:00, orange on J+1 morning, green when every column is filled. */
export function delayColumn(): GridColumn<DossierRow> {
  return {
    key: "delay",
    label: "Délai",
    filterKind: "enum",
    width: 170,
    sortable: false,
    filterable: true,
    knownValues: DELAYS,
    formatValue: (v) => DELAY_LABELS[v as Delay] ?? v,
    renderValue: (v) => <DelayBadge delay={v as Delay} />,
    render: (row) => (
      <span className="flex h-8 items-center px-1">
        <DelayBadge delay={row.delay} />
      </span>
    ),
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

/** Column "Équipe J-1": who works the J-1 columns (Planification when "Cellule plani" is not "Planifié"). */
export function routeColumn(): GridColumn<DossierRow> {
  const label = (v: string) => (v === "PLANIFICATION" ? "Planification" : "Sécurisation");
  const chip = (v: string) => (
    <span
      className={
        v === "PLANIFICATION"
          ? "rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200"
          : "rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200"
      }
    >
      {label(v)}
    </span>
  );
  return {
    key: "route",
    label: "Équipe J-1",
    filterKind: "enum",
    width: 150,
    sortable: true,
    filterable: true,
    knownValues: ["PLANIFICATION", "SECURISATION"],
    formatValue: label,
    renderValue: chip,
    render: (row) => <span className="flex h-8 items-center px-1">{chip(row.planification ? "PLANIFICATION" : "SECURISATION")}</span>,
  };
}
