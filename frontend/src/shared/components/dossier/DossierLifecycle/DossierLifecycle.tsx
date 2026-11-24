"use client";

import { useMemo, useState } from "react";
import { Activity, ChevronRight, History, Mail, PencilLine, UserRound } from "lucide-react";
import { useDossierTimeline } from "../../../hooks/useDossierTimeline";
import type { DossierTimeline, FieldSection, TimelineEvent, TimelineStage } from "../../../types";
import { cn } from "../../../utils/cn";
import { formatDateTime } from "../../../utils/date";
import { SECTION_THEME, stageTheme } from "../../../utils/sectionTheme";
import { Alert1 } from "../../alert/Alert1/Alert1";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { Skeleton } from "../../feedback/Skeleton/Skeleton";
import { DelayBadge } from "../DelayBadge/DelayBadge";
import { EventList } from "../EventList/EventList";
import { StageModal } from "../StageModal/StageModal";
import { StageTrack } from "../StageTrack/StageTrack";

type HistoryTab = "ALL" | "MAIL" | "SECURISATION" | "PLANIFICATION" | "J" | "J_PLUS_1";

const SERVICE_TABS: { id: Exclude<HistoryTab, "ALL" | "MAIL">; label: string; sections: FieldSection[] }[] = [
  { id: "SECURISATION", label: "Sécurisation", sections: ["SECURISATION", "J_MINUS_1"] },
  { id: "PLANIFICATION", label: "Planification", sections: ["PLANIFICATION"] },
  { id: "J", label: "J", sections: ["J"] },
  { id: "J_PLUS_1", label: "J+1", sections: ["J_PLUS_1"] },
];

const isMailEvent = (e: TimelineEvent) => !!e.field && /mail/i.test(e.field);

/** Full life cycle of a dossier: where it is, every step (click = its columns), the history by service. */
export function DossierLifecycle({ dossierId }: { dossierId: number }) {
  const { timeline, error, loading } = useDossierTimeline(dossierId);
  const [stage, setStage] = useState<TimelineStage | null>(null);

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
        <StageTrack stages={timeline.stages} onSelect={setStage} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat icon={<Activity className="size-3.5" />} label="Étape actuelle" value={current?.label ?? "—"} />
          <Stat icon={<History className="size-3.5" />} label="Événements" value={String(timeline.events.length)} />
          <Stat icon={<PencilLine className="size-3.5" />} label="Modifications" value={String(timeline.edits)} highlight={timeline.edits > 0} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <DelayBadge delay={timeline.delay} />
          {timeline.horsSecu && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">Hors sécurisation (N/A)</span>
          )}
          {timeline.assignees.map((a) => (
            <span
              key={a.team}
              title={a.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                SECTION_THEME[a.team === "J" ? "J" : a.team].chip,
              )}
            >
              <UserRound className="size-3" /> {a.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Étapes</h4>
        <ol className="space-y-2">
          {timeline.stages.map((s) => {
            const theme = stageTheme(s.key);
            const clickable = s.key !== "IMPORT";
            const content = (
              <>
                <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", s.status === "PENDING" ? "bg-slate-200" : theme.solid)} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", s.status === "PENDING" ? "text-slate-400" : theme.text)}>{s.label}</p>
                  {s.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{s.detail}</p>}
                </div>
                <span className="shrink-0 text-right font-mono text-[10px] text-slate-400">
                  {s.status === "PENDING" ? "en attente" : s.at ? formatDateTime(s.at) : "—"}
                </span>
                {clickable && <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-300 transition-transform group-hover/st:translate-x-0.5" />}
              </>
            );
            const base = cn(
              "group/st flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition-colors",
              s.status === "CURRENT" ? cn(theme.soft, theme.ring) : s.status === "DONE" ? "bg-white ring-slate-200/80" : "bg-slate-50/60 ring-slate-100",
            );
            return (
              <li key={s.key}>
                {clickable ? (
                  <button type="button" onClick={() => setStage(s)} className={cn(base, "hover:ring-slate-300")}>
                    {content}
                  </button>
                ) : (
                  <div className={base}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <HistoryTabs timeline={timeline} />

      <StageModal stage={stage} onClose={() => setStage(null)} />
    </div>
  );
}

/** History split by service (each in its colour) + a "Mail" tab with every mail and its objet. */
function HistoryTabs({ timeline }: { timeline: DossierTimeline }) {
  const [tab, setTab] = useState<HistoryTab>("ALL");

  const bySection = useMemo(() => {
    const map = new Map<HistoryTab, TimelineEvent[]>();
    for (const t of SERVICE_TABS) map.set(t.id, timeline.events.filter((e) => e.section && t.sections.includes(e.section)));
    map.set("MAIL", timeline.events.filter(isMailEvent));
    return map;
  }, [timeline.events]);

  const tabs: { id: HistoryTab; label: string; count: number; dot?: string }[] = [
    { id: "ALL", label: "Tout", count: timeline.events.length },
    { id: "MAIL", label: "Mail", count: timeline.mails.filter((m) => m.value).length, dot: "bg-sky-500" },
    ...SERVICE_TABS.filter((t) => t.id !== "PLANIFICATION" || timeline.planification || (bySection.get(t.id)?.length ?? 0) > 0).map((t) => ({
      id: t.id,
      label: t.label,
      count: bySection.get(t.id)?.length ?? 0,
      dot: SECTION_THEME[t.id].solid,
    })),
  ];

  return (
    <section>
      <h4 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Historique</h4>
      <div role="tablist" aria-label="Historique" className="scroll-thin -mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => {
          const on = tab === t.id;
          const theme = t.id !== "ALL" && t.id !== "MAIL" ? SECTION_THEME[t.id] : null;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 transition-colors",
                on
                  ? theme
                    ? cn(theme.soft, theme.ring)
                    : t.id === "MAIL"
                      ? "bg-sky-50 text-sky-700 ring-sky-200"
                      : "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-500 ring-slate-200 hover:text-slate-800",
              )}
            >
              {t.id === "MAIL" ? <Mail className="size-3.5" /> : t.dot && <span className={cn("size-2 rounded-full", t.dot)} />}
              {t.label}
              <span className={cn("rounded-full px-1.5 font-mono text-[10px] tabular-nums", on ? "bg-white/70" : "bg-slate-100")}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === "MAIL" ? (
        <MailPanel timeline={timeline} events={bySection.get("MAIL") ?? []} />
      ) : (
        <EventList
          events={tab === "ALL" ? timeline.events : (bySection.get(tab) ?? [])}
          emptyLabel="Aucun événement pour ce service"
        />
      )}
    </section>
  );
}

/** Every mail column of the dossier: answer, objet, who and when. */
function MailPanel({ timeline, events }: { timeline: DossierTimeline; events: TimelineEvent[] }) {
  if (timeline.mails.length === 0) return <p className="py-4 text-center text-xs text-slate-400">Aucune colonne mail</p>;
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="grid grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.4fr)] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 font-mono text-[9px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
          <span>Mail</span>
          <span>Envoyé</span>
          <span>Objet</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {timeline.mails.map((m) => (
            <li key={m.fieldId} className="grid grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.4fr)] items-start gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900">{m.label}</p>
                <span className={cn("mt-0.5 inline-block rounded-md px-1.5 py-px font-mono text-[9px] font-semibold uppercase ring-1", SECTION_THEME[m.section].chip)}>
                  {m.sectionLabel}
                </span>
              </div>
              <div className="pt-0.5">{m.value ? <ValueChip value={m.value} size="xs" /> : <span className="text-xs text-slate-300">—</span>}</div>
              <div className="min-w-0">
                {m.objet ? (
                  <p className="text-[13px] break-words text-slate-800">{m.objet}</p>
                ) : (
                  <p className="text-xs text-slate-300">{m.value ? "Objet non renseigné" : "—"}</p>
                )}
                {m.by && (
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    par {m.by}
                    {m.at && ` · ${formatDateTime(m.at)}`}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <EventList events={events} emptyLabel="Aucun mail saisi" />
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
