"use client";

import { Hand, UserRound, UsersRound } from "lucide-react";
import { workersOf, type DossierRow, type Team } from "../../../types";
import { cn } from "../../../utils/cn";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";

const MAX_AVATARS = 3;

interface PilotsCellProps {
  row: DossierRow;
  team: Team;
  /** Display name of a username. */
  nameOf: (username: string) => string;
  /** Connected user. */
  me: string;
  /** The connected user can take / join this dossier (click opens the confirmation). */
  canJoin: boolean;
  onOpen?: (row: DossierRow, team: Team) => void;
}

/**
 * Pilots working on a dossier: avatars of the lead and of the pilots who joined him.
 * Nobody yet: "Prendre". A pilot clicks to take the dossier or join the others (confirmation first).
 */
export function PilotsCell({ row, team, nameOf, me, canJoin, onOpen }: PilotsCellProps) {
  const people = workersOf(row, team);
  const mine = people.includes(me);
  const lead = people[0];
  const shown = people.slice(0, MAX_AVATARS);
  const more = people.length - shown.length;
  const names = people.map(nameOf);
  const title = people.length
    ? `${names.join(", ")}${canJoin ? (mine ? " · cliquer pour voir / quitter" : " · cliquer pour rejoindre") : ""}`
    : canJoin
      ? "Personne ne travaille ce dossier : cliquer pour le prendre"
      : "Personne ne travaille ce dossier";

  const display = people.length ? (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 -space-x-1.5">
        {shown.map((u) => (
          <Avatar1
            key={u}
            name={nameOf(u)}
            size="sm"
            className={cn("size-6 text-[9px] ring-2", u === me ? "ring-emerald-400" : "ring-white")}
          />
        ))}
      </span>
      <span className="min-w-0 truncate text-[13px] font-medium text-slate-700">
        {lead === me ? "Vous" : nameOf(lead)}
        {people.length > 1 && (
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-500 tabular-nums">
            +{people.length - 1}
          </span>
        )}
      </span>
      {mine && lead !== me && (
        <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">vous</span>
      )}
      {more > 0 && <span className="sr-only">et {more} autre(s)</span>}
    </span>
  ) : canJoin ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-emerald-300 bg-emerald-50/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 transition-colors group-hover/pil:border-emerald-400 group-hover/pil:bg-emerald-50">
      <Hand className="size-3" /> Prendre
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-400">
      <UserRound className="size-3" /> Personne
    </span>
  );

  if (!canJoin || !onOpen) {
    return (
      <span className="flex h-8 items-center px-1" title={title}>
        {display}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={title}
      onClick={() => onOpen(row, team)}
      aria-label={people.length ? `Pilotes du dossier ${row.idExterne} : ${names.join(", ")}` : `Prendre le dossier ${row.idExterne}`}
      className={cn(
        "group/pil flex h-8 w-full items-center gap-1 rounded-lg px-1 text-left transition-all duration-200",
        "hover:bg-white hover:shadow-soft hover:ring-1 hover:ring-slate-200 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none",
      )}
    >
      <span className="min-w-0 flex-1">{display}</span>
      {people.length > 0 && !mine && (
        <UsersRound className="size-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/pil:opacity-100" aria-hidden />
      )}
    </button>
  );
}
