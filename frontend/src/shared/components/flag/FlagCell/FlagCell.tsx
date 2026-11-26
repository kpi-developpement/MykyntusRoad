"use client";

import { useState } from "react";
import { Flag as FlagIcon, Hand, Plus } from "lucide-react";
import { useFlags } from "../../../hooks/useFlags";
import type { DossierRow } from "../../../types";
import { cn } from "../../../utils/cn";
import { Popover } from "../../popover/Popover/Popover";
import { FlagBadge } from "../FlagBadge/FlagBadge";
import { FlagMenu } from "../FlagMenu/FlagMenu";

export interface FlagCellActions {
  editable: boolean;
  onApply: (row: DossierRow, codes: string[]) => Promise<void>;
  onReset: (row: DossierRow) => Promise<void>;
}

interface FlagCellProps extends FlagCellActions {
  row: DossierRow;
  /** Next to the ID Externe: compact, no placeholder when there is no flag. */
  inline?: boolean;
}

/** Flags of a dossier; click = flag menu (toggle, create, back to automatic). */
export function FlagCell({ row, editable, onApply, onReset, inline = false }: FlagCellProps) {
  const { byCode } = useFlags();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const max = inline ? 3 : 4;
  const shown = row.flags.slice(0, max);
  const more = row.flags.length - shown.length;
  const empty = row.flags.length === 0;

  if (inline && empty && !editable) return null;

  const content = (
    <span className={cn("flex items-center gap-1 overflow-hidden", !inline && "min-w-0 flex-1")}>
      {empty ? (
        inline ? (
          <span className="grid size-5 place-items-center rounded-md border border-dashed border-slate-300 text-slate-400 opacity-0 transition-opacity group-hover/row:opacity-100">
            <Plus className="size-3" />
          </span>
        ) : (
          <span className="px-1 text-slate-300">—</span>
        )
      ) : (
        <>
          {shown.map((c) => (
            <FlagBadge key={c} code={c} flag={byCode.get(c)} size="xs" />
          ))}
          {more > 0 && <span className="font-mono text-[10px] font-semibold text-slate-400">+{more}</span>}
        </>
      )}
      {row.flagsManual && (
        <span title="Drapeaux modifiés à la main" className={cn("grid size-4 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700", !inline && "ml-auto")}>
          <Hand className="size-2.5" />
        </span>
      )}
    </span>
  );

  const title = row.flags.map((c) => byCode.get(c)?.label ?? c).join(" · ") || (editable ? "Ajouter un drapeau" : "");

  if (!editable) {
    return inline ? (
      <span className="flex shrink-0 items-center" title={title}>
        {content}
      </span>
    ) : (
      <span className="flex h-8 items-center px-1">{content}</span>
    );
  }

  return (
    <>
      <button
        type="button"
        title={title}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        aria-label={`Drapeaux de ${row.idExterne}`}
        className={cn(
          "group/flag flex items-center gap-1 rounded-lg text-left transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none",
          inline ? "h-7 shrink-0 px-0.5" : "h-8 w-full px-1",
          anchor ? "bg-white shadow-soft ring-1 ring-brand-300" : "hover:bg-white hover:shadow-soft hover:ring-1 hover:ring-slate-200",
        )}
      >
        {content}
        {!inline && <FlagIcon className="size-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/flag:opacity-100" />}
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
