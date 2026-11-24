"use client";

import { CheckCircle2, CircleDashed } from "lucide-react";
import type { TimelineStage } from "../../../types";
import { cn } from "../../../utils/cn";
import { formatDate, formatDateTime } from "../../../utils/date";
import { stageTheme } from "../../../utils/sectionTheme";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { Modal1 } from "../../modal/Modal1/Modal1";

interface StageModalProps {
  stage: TimelineStage | null;
  onClose: () => void;
}

/** Every column of one step of the dossier: filled (value, by whom, when) or still empty. */
export function StageModal({ stage, onClose }: StageModalProps) {
  const theme = stage ? stageTheme(stage.key) : null;
  const filled = stage?.fields.filter((f) => f.value !== null).length ?? 0;
  const total = stage?.fields.length ?? 0;
  const pct = total ? Math.round((filled / total) * 100) : 0;

  return (
    <Modal1
      open={!!stage}
      onClose={onClose}
      size="md"
      title={
        stage && (
          <span className="inline-flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", theme?.solid)} />
            {stage.label}
          </span>
        )
      }
      description={stage ? `${filled} / ${total} colonne(s) remplie(s)` : undefined}
    >
      {stage && theme && (
        <div className="space-y-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full transition-[width] duration-500", theme.solid)} style={{ width: `${pct}%` }} />
          </div>
          {stage.fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Aucune colonne dans cette étape.</p>
          ) : (
            <ul className={cn("divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1", theme.ring)}>
              {stage.fields.map((f) => {
                const empty = f.value === null;
                return (
                  <li key={f.id} className={cn("flex items-start gap-3 px-4 py-3", empty && "bg-slate-50/70")}>
                    {empty ? (
                      <CircleDashed className="mt-0.5 size-4 shrink-0 text-slate-300" />
                    ) : (
                      <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", theme.text)} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", empty ? "text-slate-500" : "text-slate-900")}>
                        {f.label}
                        {!f.required && <span className="ml-2 font-mono text-[9px] tracking-wide text-slate-400 uppercase">facultatif</span>}
                      </p>
                      {!empty && (f.by || f.at) && (
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                          {f.by && <>par {f.by}</>}
                          {f.by && f.at && " · "}
                          {f.at && formatDateTime(f.at)}
                        </p>
                      )}
                    </div>
                    <div className="max-w-[55%] shrink-0 text-right">
                      {empty ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">Non rempli</span>
                      ) : f.type === "SELECT" ? (
                        <ValueChip value={f.value as string} size="xs" />
                      ) : (
                        <span className="text-sm break-words text-slate-800">{f.type === "DATE" ? formatDate(f.value as string) : f.value}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal1>
  );
}
