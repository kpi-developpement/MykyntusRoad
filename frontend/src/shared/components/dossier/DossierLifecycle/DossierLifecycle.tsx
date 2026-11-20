"use client";

import { Activity, History, PencilLine } from "lucide-react";
import { useDossierTimeline } from "../../../hooks/useDossierTimeline";
import { formatDateTime } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import { Alert1 } from "../../alert/Alert1/Alert1";
import { Skeleton } from "../../feedback/Skeleton/Skeleton";
import { EventList } from "../EventList/EventList";
import { StageTrack } from "../StageTrack/StageTrack";

/** Full life cycle of a dossier: where it is, every step with its date, every change. */
export function DossierLifecycle({ dossierId }: { dossierId: number }) {
  const { timeline, error, loading } = useDossierTimeline(dossierId);

  if (error) return <Alert1 tone="error">{error}</Alert1>;
  if (loading || !timeline) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const current = timeline.stages.find((s) => s.status === "CURRENT");

  return (
    <div className="space-y-6">
      <section className="surface rounded-2xl p-4">
        <StageTrack stages={timeline.stages} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat icon={<Activity className="size-3.5" />} label="Étape actuelle" value={current?.label ?? "—"} />
          <Stat icon={<History className="size-3.5" />} label="Événements" value={String(timeline.events.length)} />
          <Stat icon={<PencilLine className="size-3.5" />} label="Modifications" value={String(timeline.edits)} highlight={timeline.edits > 0} />
        </div>
      </section>

      <section>
        <h4 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Étapes</h4>
        <ol className="space-y-2">
          {timeline.stages.map((s) => (
            <li
              key={s.key}
              className={cn(
                "flex items-start justify-between gap-4 rounded-xl px-3 py-2.5 ring-1 ring-inset",
                s.status === "CURRENT" ? "bg-brand-50/70 ring-brand-200" : s.status === "DONE" ? "bg-white ring-slate-200/80" : "bg-slate-50/60 ring-slate-100",
              )}
            >
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", s.status === "PENDING" ? "text-slate-400" : "text-slate-900")}>{s.label}</p>
                {s.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{s.detail}</p>}
              </div>
              <span className="shrink-0 text-right font-mono text-[10px] text-slate-400">
                {s.status === "PENDING" ? "en attente" : s.at ? formatDateTime(s.at) : "—"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h4 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Historique</h4>
        <EventList events={timeline.events} />
      </section>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl px-2 py-2", highlight ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700")}>
      <p className="flex items-center justify-center gap-1 font-mono text-[9px] tracking-[0.12em] uppercase opacity-70">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 truncate font-display text-sm font-semibold">{value}</p>
    </div>
  );
}
