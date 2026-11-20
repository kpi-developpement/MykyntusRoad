"use client";

import { useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { isTypingTarget, useHotkey } from "../../../hooks/useHotkey";
import { cn } from "../../../utils/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Focus with the "/" key. */
  shortcut?: boolean;
  className?: string;
  autoFocus?: boolean;
}

const slashKey = (e: KeyboardEvent) => e.key === "/" && !isTypingTarget(e.target);

export function SearchInput({ value, onChange, placeholder = "Rechercher…", shortcut, className, autoFocus }: SearchInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const focus = useCallback(() => ref.current?.focus(), []);
  useHotkey(slashKey, focus, !!shortcut);

  return (
    <div className={cn("group/search relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-slate-400 transition-colors group-focus-within/search:text-brand-600" />
      <input
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && value && (e.stopPropagation(), onChange(""))}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl bg-white pr-10 pl-9 text-sm text-slate-900 shadow-soft ring-1 ring-slate-200 transition-[box-shadow] duration-300 ring-inset placeholder:text-slate-400 hover:ring-slate-300 focus:shadow-[0_0_0_4px_rgb(37_72_234/0.12)] focus:ring-2 focus:ring-brand-500 focus:outline-none"
      />
      <span className="absolute right-2.5 flex items-center">
        {value ? (
          <button
            onClick={() => {
              onChange("");
              focus();
            }}
            className="grid size-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Effacer la recherche"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          shortcut && (
            <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 group-focus-within/search:hidden">
              /
            </kbd>
          )
        )}
      </span>
    </div>
  );
}
