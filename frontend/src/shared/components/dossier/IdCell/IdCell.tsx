"use client";

import { useEffect, useRef, useState } from "react";
import { PanelRightOpen, ShieldAlert } from "lucide-react";
import { DELAY_LABELS, SECU_ALERT_LABELS, type DossierRow } from "../../../types";
import { cn } from "../../../utils/cn";
import { DELAY_TONE } from "../../../utils/delayTone";
import { FlagCell, type FlagCellActions } from "../../flag/FlagCell/FlagCell";
import { Popover } from "../../popover/Popover/Popover";
import { RoadmapCard } from "../RoadmapCard/RoadmapCard";

const HOLD_MS = 3000;
const CLOSE_GRACE_MS = 250;

interface IdCellProps {
  row: DossierRow;
  onOpen?: (row: DossierRow) => void;
  /** Flags shown (and edited) right next to the ID: they always travel with it. */
  flags?: FlagCellActions | null;
}

/**
 * ID Externe of a dossier, with its flags attached and the sécurisation alert of the day before.
 * Hover 3 s (a ring fills up meanwhile) → compact road map. Click → full life cycle.
 */
export function IdCell({ row, onOpen, flags }: IdCellProps) {
  const [holding, setHolding] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  function startHold(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "mouse") return;
    clearTimers();
    const el = e.currentTarget;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      setAnchor(el);
    }, HOLD_MS);
  }

  function leave() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setHolding(false);
    if (anchor) closeTimer.current = setTimeout(() => setAnchor(null), CLOSE_GRACE_MS);
  }

  function open() {
    clearTimers();
    setHolding(false);
    setAnchor(null);
    onOpen?.(row);
  }

  // orange: J+1 morning and not closed, red: after J+1 12:00
  const late = row.delay === "LATE" || row.delay === "SOON" || row.delay === "CANCELLED" ? DELAY_TONE[row.delay] : null;
  const alert = row.secuAlert;

  return (
    <span className="flex h-8 min-w-0 items-center gap-1">
      <button
        type="button"
        onPointerEnter={startHold}
        onPointerLeave={leave}
        onClick={open}
        title={`${late ? DELAY_LABELS[row.delay] + " · " : ""}Cliquer : cycle de vie · Survoler 3 s : road map`}
        className={cn(
          "group/id inline-flex min-w-0 shrink items-center gap-1.5 rounded-lg px-1.5 py-1 font-mono text-[12.5px] font-semibold tracking-tight transition-colors",
          late ? late.id : "text-brand-700 hover:bg-brand-50 hover:text-brand-900",
        )}
      >
        <span className="truncate">{row.idExterne}</span>
        <span className="relative grid size-4 shrink-0 place-items-center">
          {holding ? (
            <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden>
              <circle cx="8" cy="8" r="7" fill="none" stroke="#dbe6fe" strokeWidth="2" />
              <circle cx="8" cy="8" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeDasharray="44" className="[animation:hold_3s_linear_forwards]" />
            </svg>
          ) : (
            <PanelRightOpen className="size-3.5 opacity-0 transition-opacity group-hover/id:opacity-100" />
          )}
        </span>
      </button>
      {alert && (
        <span
          title={`${SECU_ALERT_LABELS[alert]} : l'état final de la sécurisation n'est pas encore renseigné`}
          className={cn(
            "relative grid size-5 shrink-0 place-items-center rounded-md ring-1",
            alert === "J" ? "bg-rose-50 text-rose-600 ring-rose-200" : "bg-amber-50 text-amber-600 ring-amber-200",
          )}
        >
          <ShieldAlert className="size-3.5" />
          {alert === "J_MINUS_1" && <span aria-hidden className="absolute inset-0 animate-ping rounded-md ring-1 ring-amber-300 [animation-duration:2.2s]" />}
          <span className="sr-only">{SECU_ALERT_LABELS[alert]}</span>
        </span>
      )}
      {flags && <FlagCell row={row} {...flags} inline />}
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={380}>
        <div
          onPointerEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
          onPointerLeave={() => setAnchor(null)}
        >
          <RoadmapCard dossierId={row.id} onOpenFull={open} />
        </div>
      </Popover>
    </span>
  );
}
