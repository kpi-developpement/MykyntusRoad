"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { toneFor } from "../../../utils/valueTone";
import { cn } from "../../../utils/cn";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
}

/** Type a value and press Enter (or comma) to add it as a chip. */
export function TagsInput({ value, onChange, placeholder = "Ajouter une valeur…", label, hint }: TagsInputProps) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim();
    if (!tag || value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold text-slate-600">{label}</span>}
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl bg-white p-1.5 shadow-soft ring-1 ring-slate-200 transition ring-inset focus-within:ring-2 focus-within:ring-brand-500">
        <AnimatePresence initial={false}>
          {value.map((tag) => {
            const tone = toneFor(tag);
            return (
              <motion.span
                key={tag}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn("inline-flex h-7 items-center gap-1.5 rounded-full pr-1 pl-2.5 text-xs font-semibold ring-1 ring-inset", tone.chip)}
              >
                <span className={cn("size-1.5 rounded-full", tone.dot)} />
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== tag))}
                  className="grid size-5 place-items-center rounded-full opacity-60 transition hover:bg-black/5 hover:opacity-100"
                  aria-label={`Retirer ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </motion.span>
            );
          })}
        </AnimatePresence>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-32 flex-1 bg-transparent px-1.5 text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}
