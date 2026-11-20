"use client";

import { useState } from "react";
import { Flag as FlagIcon, Hand } from "lucide-react";
import { useFlags } from "../../../hooks/useFlags";
import type { DossierRow } from "../../../types";
import { cn } from "../../../utils/cn";
import { Popover } from "../../popover/Popover/Popover";
import { FlagBadge } from "../FlagBadge/FlagBadge";
import { FlagMenu } from "../FlagMenu/FlagMenu";

const MAX_SHOWN = 4;

interface FlagCellProps {
  row: DossierRow;
  editable: boolean;
  onApply: (row: DossierRow, codes: string[]) => Promise<void>;
  onReset: (row: DossierRow) => Promise<void>;
}

/** Flags of a dossier in the table; click = flag menu (toggle, create, back to automatic). */
export function FlagCell({ row, editable, onApply, onReset }: FlagCellProps) {
  const { byCode } = useFlags();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const shown = row.flags.slice(0, MAX_SHOWN);
  const more = row.flags.length - shown.length;

  const content = (
    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
      {row.flags.length === 0 ? (
        <span className="px-1 text-slate-300">—</span>
      ) : (
        <>
          {shown.map((c) => (
            <FlagBadge key={c} code={c} flag={byCode.get(c)} size="xs" />
          ))}
          {more > 0 && <span className="font-mono text-[10px] font-semibold text-slate-400">+{more}</span>}
        </>
      )}
      {row.flagsManual && (
        <span title="Drapeaux modifiés à la main" className="ml-auto grid size-4 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Hand className="size-2.5" />
        </span>
      )}
    </span>
  );

  if (!editable) return <span className="flex h-8 items-center px-1">{content}</span>;

  return (
    <>
      <button
        type="button"
        title={row.flags.map((c) => byCode.get(c)?.label ?? c).join(" · ") || "Ajouter un drapeau"}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        className={cn(
          "group/flag flex h-8 w-full items-center gap-1 rounded-lg px-1 text-left transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none",
          anchor ? "bg-white shadow-soft ring-1 ring-brand-300" : "hover:bg-white hover:shadow-soft hover:ring-1 hover:ring-slate-200",
        )}
      >
        {content}
        <FlagIcon className="size-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/flag:opacity-100" />
      </button>
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} width={300}>
        <FlagMenu
          value={row.flags}
          manual={row.flagsManual}
          onApply={(codes) => onApply(row, codes)}
          onReset={() => onReset(row)}
          onClose={() => setAnchor(null)}
        />
      </Popover>
    </>
  );
}
