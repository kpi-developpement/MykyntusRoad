"use client";

import { useState } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { Button1 } from "../../button/Button1/Button1";
import { Checkbox1 } from "../../checkbox/Checkbox1/Checkbox1";
import { Popover } from "../../popover/Popover/Popover";
import type { GridColumn, GridGroup } from "../DataGrid/types";

interface ColumnsMenuProps<T> {
  columns: GridColumn<T>[];
  groups?: GridGroup[];
  isVisible: (column: GridColumn<T>) => boolean;
  onToggle: (key: string, visible: boolean) => void;
  onReset: () => void;
}

/** Show / hide the columns of a table. */
export function ColumnsMenu<T>({ columns, groups, isVisible, onToggle, onReset }: ColumnsMenuProps<T>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hideable = columns.filter((c) => !c.pinned);
  const hiddenCount = hideable.filter((c) => !isVisible(c)).length;

  const sections = new Map<string, GridColumn<T>[]>();
  for (const c of hideable) {
    const title = groups?.find((g) => g.id === c.groupId)?.title ?? "Colonnes";
    sections.set(title, [...(sections.get(title) ?? []), c]);
  }

  return (
    <>
      <Button1
        variant="secondary"
        size="sm"
        leftIcon={<Columns3 />}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-expanded={!!anchor}
        className="h-10 rounded-xl"
      >
        Colonnes
        {hiddenCount > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 tabular-nums">{hiddenCount} masquées</span>}
      </Button1>
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} align="end" width={300}>
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Colonnes affichées</p>
          <button onClick={onReset} className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
            <RotateCcw className="size-3" /> Par défaut
          </button>
        </div>
        <div className="scroll-thin max-h-[60vh] overflow-y-auto px-1.5 pb-2">
          {[...sections.entries()].map(([title, list]) => (
            <div key={title} className="mb-1">
              {sections.size > 1 && (
                <p className="px-2.5 pt-2 pb-1 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">{title}</p>
              )}
              {list.map((c) => {
                const visible = isVisible(c);
                return (
                  <button
                    key={c.key}
                    role="menuitemcheckbox"
                    aria-checked={visible}
                    onClick={() => onToggle(c.key, !visible)}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Checkbox1 checked={visible} />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Popover>
    </>
  );
}
