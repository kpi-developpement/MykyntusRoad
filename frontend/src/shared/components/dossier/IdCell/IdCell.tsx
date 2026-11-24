"use client";

import { useEffect, useRef, useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { DELAY_LABELS, type DossierRow } from "../../../types";
import { cn } from "../../../utils/cn";
import { DELAY_TONE } from "../../../utils/delayTone";
import { Popover } from "../../popover/Popover/Popover";
import { RoadmapCard } from "../RoadmapCard/RoadmapCard";

const HOLD_MS = 3000;
const CLOSE_GRACE_MS = 250;

interface IdCellProps {
  row: DossierRow;
  onOpen?: (row: DossierRow) => void;
}

/**
 * ID Externe of a dossier.
 * Hover 3 s (a ring fills up meanwhile) → compact road map. Click → full life cycle.
 */
export function IdCell({ row, onOpen }: IdCellProps) {
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

  return (
    <>
      <button
        type="button"
        onPointerEnter={startHold}
        onPointerLeave={leave}
        onClick={open}
        title={`${late ? DELAY_LABELS[row.delay] + " · " : ""}Cliquer : cycle de vie · Survoler 3 s : road map`}
        className={cn(
          "group/id inline-flex max-w-full items-center gap-2 rounded-lg px-1.5 py-1 font-mono text-[12.5px] font-semibold tracking-tight transition-colors",
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
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={380}>
        <div
          onPointerEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
          onPointerLeave={() => setAnchor(null)}
        >
          <RoadmapCard dossierId={row.id} onOpenFull={open} />
        </div>
      </Popover>
    </>
  );
}
