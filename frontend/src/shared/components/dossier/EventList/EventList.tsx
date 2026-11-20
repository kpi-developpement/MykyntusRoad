import { CirclePlus, Eraser, FileInput, Flag, PencilLine, RefreshCw, UserRoundCheck, type LucideIcon } from "lucide-react";
import type { EventType, TimelineEvent } from "../../../types";
import { cn } from "../../../utils/cn";
import { formatDateTime, formatRelative } from "../../../utils/date";
import { ValueChip } from "../../badge/ValueChip/ValueChip";

const KIND: Record<EventType, { icon: LucideIcon; tone: string; title: string }> = {
  CREATED: { icon: CirclePlus, tone: "bg-emerald-50 text-emerald-600 ring-emerald-200", title: "Dossier créé" },
  IMPORT_UPDATED: { icon: RefreshCw, tone: "bg-amber-50 text-amber-600 ring-amber-200", title: "Modifié par un import" },
  DATA_RECEIVED: { icon: FileInput, tone: "bg-cyan-50 text-cyan-700 ring-cyan-200", title: "Données reçues" },
  VALUE_SET: { icon: PencilLine, tone: "bg-brand-50 text-brand-600 ring-brand-200", title: "Valeur saisie" },
  VALUE_CLEARED: { icon: Eraser, tone: "bg-rose-50 text-rose-600 ring-rose-200", title: "Valeur effacée" },
  FLAGS_CHANGED: { icon: Flag, tone: "bg-violet-50 text-violet-600 ring-violet-200", title: "Drapeaux" },
  ASSIGNED: { icon: UserRoundCheck, tone: "bg-sky-50 text-sky-700 ring-sky-200", title: "Dispatch" },
};

const isDateLike = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** History of a dossier, newest first: imports, values set / changed / cleared, by whom and when. */
export function EventList({ events, limit }: { events: TimelineEvent[]; limit?: number }) {
  const list = [...events].reverse().slice(0, limit ?? events.length);
  if (list.length === 0) return <p className="py-4 text-center text-xs text-slate-400">Aucun événement</p>;

  return (
    <ol className="relative space-y-1">
      {list.map((e, i) => {
        // unknown types (newer backend) fall back to a neutral display instead of crashing
        const kind = KIND[e.type] ?? KIND.VALUE_SET;
        const Icon = kind.icon;
        const edited = (e.type === "VALUE_SET" && e.oldValue !== null) || e.type === "IMPORT_UPDATED" || e.type === "VALUE_CLEARED";
        return (
          <li key={e.id} className="relative flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
            {i < list.length - 1 && <span aria-hidden className="absolute top-10 bottom-[-6px] left-[23px] w-px bg-slate-200" />}
            <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-lg ring-1", kind.tone)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[13px] font-semibold text-slate-900">
                  {e.field ? (
                    <>
                      {e.field}
                      {e.sectionLabel && <span className="ml-1.5 font-mono text-[10px] font-medium text-slate-400 uppercase">{e.sectionLabel}</span>}
                    </>
                  ) : (
                    kind.title
                  )}
                  {edited && <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase ring-1 ring-amber-200">modifié</span>}
                </p>
                <time className="shrink-0 font-mono text-[10px] text-slate-400" title={formatDateTime(e.at)}>
                  {formatRelative(e.at)}
                </time>
              </div>
              {(e.oldValue !== null || e.newValue !== null) && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  {e.oldValue !== null && <span className="text-slate-400 line-through">{e.oldValue}</span>}
                  {e.oldValue !== null && e.newValue !== null && <span className="text-slate-300">→</span>}
                  {e.newValue !== null &&
                    (isDateLike(e.newValue) || e.newValue.length > 40 ? (
                      <span className="font-medium text-slate-700">{e.newValue}</span>
                    ) : (
                      <ValueChip value={e.newValue} size="xs" />
                    ))}
                </div>
              )}
              {e.detail && <p className="mt-1 text-xs whitespace-pre-line text-slate-500">{e.detail}</p>}
              {e.actor && <p className="mt-0.5 font-mono text-[10px] text-slate-400">par {e.actor}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
