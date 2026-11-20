"use client";

import type { LucideIcon } from "lucide-react";
import { Popover } from "../../popover/Popover/Popover";
import { cn } from "../../../utils/cn";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "danger";
  onSelect: () => void;
}

interface DropdownMenuProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  header?: React.ReactNode;
  align?: "start" | "end";
  width?: number;
}

export function DropdownMenu({ anchor, open, onClose, items, header, align = "end", width = 240 }: DropdownMenuProps) {
  return (
    <Popover anchor={anchor} open={open} onClose={onClose} align={align} width={width}>
      {header && <div className="border-b border-slate-100 px-4 py-3">{header}</div>}
      <div className="p-1.5" role="menu">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                onClose();
                item.onSelect();
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                item.tone === "danger" ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {Icon && <Icon className="size-4 opacity-70 transition group-hover:opacity-100" />}
              <span className="flex-1">{item.label}</span>
              {item.hint && <kbd className="text-[10px] font-semibold text-slate-400">{item.hint}</kbd>}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
