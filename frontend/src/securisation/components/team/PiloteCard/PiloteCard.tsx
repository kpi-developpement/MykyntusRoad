"use client";

import { motion } from "motion/react";
import { CircleCheck, CirclePause, PencilLine, Trash2 } from "lucide-react";
import { Avatar1 } from "@/shared/components/avatar/Avatar1/Avatar1";
import { IconButton } from "@/shared/components/button/IconButton/IconButton";
import { ProgressRing } from "@/shared/components/chart/ProgressRing/ProgressRing";
import { useTilt } from "@/shared/hooks/useTilt";
import type { Pilote } from "@/shared/types";
import { cn } from "@/shared/utils/cn";
import { formatRelative } from "@/shared/utils/date";

interface PiloteCardProps {
  pilote: Pilote;
  index: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

/** 3D card of a pilot: identity, workload (treated / assigned) and quick actions. */
export function PiloteCard({ pilote, index, onEdit, onToggle, onDelete }: PiloteCardProps) {
  const ref = useTilt<HTMLDivElement>(9);
  const name = pilote.fullName || pilote.username;
  const pct = pilote.assigned ? Math.round((pilote.treated / pilote.assigned) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, rotateX: -12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: Math.min(index, 12) * 0.045, ease: [0.16, 1, 0.3, 1], duration: 0.55 }}
      style={{ transformPerspective: 900 }}
    >
      <div ref={ref} className={cn("tilt surface relative rounded-3xl p-5", !pilote.active && "opacity-70 grayscale-[0.6]")}>
        <span aria-hidden className="tilt-glare" />
        <span aria-hidden className="hud-corners" />
        <div className="flex items-start gap-4">
          <div className="tilt-pop relative">
            <Avatar1 name={name} size="lg" className="shadow-[0_14px_30px_-12px_rgb(37_72_234/0.7)]" />
            <span
              className={cn(
                "absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-white",
                pilote.active ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600",
              )}
            >
              {pilote.active ? <CircleCheck className="size-3" /> : <CirclePause className="size-3" />}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold tracking-tight text-slate-950">{name}</p>
            <p className="truncate font-mono text-[11px] text-slate-500">@{pilote.username}</p>
            <p className="mt-1 font-mono text-[10px] text-slate-400">créé {formatRelative(pilote.createdAt)}</p>
          </div>
          <div className="tilt-pop">
            <ProgressRing value={pct} size={58} stroke={5} from="#38bdf8" to="#2548ea">
              <span className="font-display text-xs font-bold text-slate-800 tabular-nums">{pct}%</span>
            </ProgressRing>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Attribués" value={pilote.assigned} />
          <Stat label="Traités" value={pilote.treated} tone="text-emerald-600" />
          <Stat label="Restants" value={Math.max(0, pilote.assigned - pilote.treated)} tone="text-brand-600" />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide uppercase ring-1 transition-colors",
              pilote.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200",
            )}
          >
            {pilote.active ? "Actif" : "Désactivé"}
          </button>
          <div className="flex gap-1">
            <IconButton label="Modifier" size="sm" onClick={onEdit}>
              <PencilLine />
            </IconButton>
            <IconButton label="Supprimer" size="sm" onClick={onDelete} className="hover:bg-rose-50 hover:text-rose-600">
              <Trash2 />
            </IconButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50/80 py-2 ring-1 ring-slate-200/70 ring-inset">
      <p className={cn("font-display text-lg font-bold tabular-nums", tone)}>{value}</p>
      <p className="font-mono text-[9px] tracking-[0.16em] text-slate-400 uppercase">{label}</p>
    </div>
  );
}
