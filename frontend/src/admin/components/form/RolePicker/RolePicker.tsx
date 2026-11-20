"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { Role } from "@/shared/types";
import { cn } from "@/shared/utils/cn";
import { ROLE_INFO, ROLES } from "../../../roles";

interface RolePickerProps {
  value: Role;
  onChange: (role: Role) => void;
}

/** Role choice as selectable cards describing the rights. */
export function RolePicker({ value, onChange }: RolePickerProps) {
  return (
    <div role="radiogroup" className="grid gap-2.5">
      {ROLES.map((role) => {
        const info = ROLE_INFO[role];
        const selected = role === value;
        const Icon = info.icon;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(role)}
            className={cn(
              "relative flex items-center gap-3.5 rounded-2xl p-3.5 text-left ring-1 transition-all duration-200 ring-inset",
              selected ? "bg-brand-50/70 ring-2 ring-brand-500" : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300",
            )}
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", info.iconClass)}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{info.label}</span>
              <span className="block text-xs text-slate-500">{info.description}</span>
            </span>
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full ring-1 transition", selected ? "bg-brand-600 ring-brand-600" : "ring-slate-300")}>
              {selected && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="size-3 text-white" strokeWidth={3.5} />
                </motion.span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
