"use client";

import { DELAY_LABELS, TEAM_LABELS, assigneeKey, assigneeOf, type Delay, type DossierRow, type Pilote, type SourceColumn, type Team } from "../../../types";
import { DelayBadge } from "../../dossier/DelayBadge/DelayBadge";
import { formatDate, weekdayShort } from "../../../utils/date";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { AssigneeCell } from "../../dossier/AssigneeCell/AssigneeCell";
import { IdCell } from "../../dossier/IdCell/IdCell";
import { PilotsCell } from "../../dossier/PilotsCell/PilotsCell";
import type { FlagCellActions } from "../../flag/FlagCell/FlagCell";
import type { GridColumn } from "../DataGrid/types";

/** Flags shown in the ID cell (editable by the sécurisation and the admin). */
export type FlagColumnOptions = FlagCellActions;

export interface PilotColumnOptions {
  team: Team;
  /** Display name of a username. */
  nameOf: (username: string) => string;
  /** Connected user. */
  me: string;
  /** The connected user takes / joins the dossiers of this team (click = confirmation). */
  canJoin: boolean;
  onOpenJoin?: (row: DossierRow, team: Team) => void;
  /** Dispatch of the team changed in one click (sécurisation admin). */
  dispatch?: { pilotes: Pilote[] | null; onAssign: (row: DossierRow, pilote: string | null, team: Team) => Promise<void> } | null;
}

/** Column "Pilote": who works the dossier (lead + pilots who joined), take / join in one click. */
export function pilotsColumn({ team, nameOf, me, canJoin, onOpenJoin, dispatch }: PilotColumnOptions): GridColumn<DossierRow> {
  const label = (v: string) => nameOf(v);
  return {
    key: assigneeKey(team),
    label: TEAM_LABELS[team],
    filterKind: "enum",
    width: 210,
    sortable: true,
    filterable: true,
    bright: true,
    formatValue: label,
    renderValue: (v) => (
      <span className="inline-flex items-center gap-1.5">
        <Avatar1 name={label(v)} size="sm" className="size-5 text-[8px]" />
        {label(v)}
      </span>
    ),
    render: (row) =>
      dispatch ? (
        <AssigneeCell
          assignee={assigneeOf(row, team)}
          joined={row.workers?.[team] ?? []}
          nameOf={nameOf}
          pilotes={dispatch.pilotes}
          editable
          onAssign={(pilote) => dispatch.onAssign(row, pilote, team)}
        />
      ) : (
        <PilotsCell row={row} team={team} nameOf={nameOf} me={me} canJoin={canJoin} onOpen={onOpenJoin} />
      ),
  };
}

const DELAYS: Delay[] = ["LATE", "SOON", "ON_TIME", "DONE", "CANCELLED"];

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

/**
 * Column "Ordre de travail : ID Externe" with the flags of the dossier attached to it (they always stay
 * next to the ID, whatever the order of the columns). Click = life cycle, hover 3 s = road map.
 */
export function idColumn(onOpen?: (row: DossierRow) => void, flags?: FlagColumnOptions | null): GridColumn<DossierRow> {
  return {
    key: "idExterne",
    label: flags ? "ID Externe · drapeaux" : "Ordre de travail : ID Externe",
    width: flags ? 318 : 214,
    pinned: true,
    sortable: true,
    filterable: true,
    bright: true,
    render: (row) => <IdCell row={row} onOpen={onOpen} flags={flags} />,
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
