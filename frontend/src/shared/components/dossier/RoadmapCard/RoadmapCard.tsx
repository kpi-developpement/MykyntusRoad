"use client";

import { ArrowRight } from "lucide-react";
import { useDossierTimeline } from "../../../hooks/useDossierTimeline";
import { formatDate } from "../../../utils/date";
import { Skeleton } from "../../feedback/Skeleton/Skeleton";
import { EventList } from "../EventList/EventList";
import { StageTrack } from "../StageTrack/StageTrack";

interface RoadmapCardProps {
  dossierId: number;
  onOpenFull: () => void;
}

/** Compact road map shown after hovering an ID Externe for 3 seconds. */
export function RoadmapCard({ dossierId, onOpenFull }: RoadmapCardProps) {
  const { timeline, error } = useDossierTimeline(dossierId);
  const current = timeline?.stages.find((s) => s.status === "CURRENT");

  return (
    <div className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.2em] text-sky-600 uppercase">Road map</p>
          <p className="truncate font-mono text-sm font-semibold text-brand-800">{timeline?.idExterne ?? "…"}</p>
        </div>
        {timeline && <span className="shrink-0 font-mono text-[10px] text-slate-400">{formatDate(timeline.date)}</span>}
      </div>

      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : !timeline ? (
        <div className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <>
          <StageTrack stages={timeline.stages} />
          <div className="mt-3 rounded-xl bg-brand-50/70 px-3 py-2 ring-1 ring-brand-100">
            <p className="text-xs text-slate-600">
              Étape actuelle : <span className="font-semibold text-brand-800">{current?.label ?? "—"}</span>
            </p>
            {current?.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{current.detail}</p>}
            <p className="mt-1 font-mono text-[10px] text-slate-500">
              {timeline.events.length} événement(s) ·{" "}
              <span className={timeline.edits > 0 ? "font-semibold text-amber-700" : ""}>{timeline.edits} modification(s)</span>
            </p>
          </div>
          <div className="mt-3 max-h-56 overflow-y-auto scroll-thin">
            <EventList events={timeline.events} limit={3} />
          </div>
        </>
      )}

      <button
        onClick={onOpenFull}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900/[0.04] py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
      >
        Voir le cycle complet <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
