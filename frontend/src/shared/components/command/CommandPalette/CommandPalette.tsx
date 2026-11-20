"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CornerDownLeft, FileSearch, LogOut, PanelLeft, Search, type LucideIcon } from "lucide-react";
import { homeFor, useAuth } from "../../../context/AuthContext";
import { useLayout } from "../../../context/LayoutContext";
import { useFocusOnMount } from "../../../hooks/useFocusOnMount";
import { cn } from "../../../utils/cn";

interface Command {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  hint?: string;
  run: () => void;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/** Ctrl + K: jump to a page, search a dossier, run an action. */
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useLayout();
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>{paletteOpen && <PaletteDialog onClose={() => setPaletteOpen(false)} />}</AnimatePresence>,
    document.body,
  );
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const { nav, requestSearch, toggleCollapsed } = useLayout();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useFocusOnMount<HTMLInputElement>();

  const commands = useMemo<Command[]>(() => {
    const q = normalize(query.trim());
    const list: Command[] = [];
    if (q.length >= 2 && user) {
      list.push({
        id: "search",
        group: "Dossiers",
        label: `Rechercher « ${query.trim()} »`,
        description: "Filtrer le tableau des dossiers par ID Externe",
        icon: FileSearch,
        run: () => {
          requestSearch(query.trim());
          router.push(homeFor(user.role));
        },
      });
    }
    for (const section of nav) {
      for (const item of section.items) {
        if (!q || normalize(`${item.label} ${item.description ?? ""} ${section.title}`).includes(q)) {
          list.push({
            id: item.href,
            group: "Navigation",
            label: item.label,
            description: item.description,
            icon: item.icon,
            run: () => router.push(item.href),
          });
        }
      }
    }
    const actions: Command[] = [
      { id: "sidebar", group: "Actions", label: "Réduire / agrandir le menu", icon: PanelLeft, hint: "Ctrl B", run: toggleCollapsed },
      { id: "logout", group: "Actions", label: "Se déconnecter", icon: LogOut, run: logout },
    ];
    list.push(...actions.filter((a) => !q || normalize(a.label).includes(q)));
    return list;
  }, [query, nav, user, requestSearch, router, toggleCollapsed, logout]);

  const safeActive = Math.min(active, Math.max(commands.length - 1, 0));

  function run(command: Command | undefined) {
    if (!command) return;
    onClose();
    command.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((safeActive + 1) % Math.max(commands.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((safeActive - 1 + commands.length) % Math.max(commands.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(commands[safeActive]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <motion.div
        className="absolute inset-0 bg-night/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="surface-pop relative w-full max-w-xl overflow-hidden rounded-3xl"
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8, transition: { duration: 0.12 } }}
        transition={{ type: "spring", stiffness: 480, damping: 34 }}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-transparent via-sky-400 to-transparent" />
        <div className="flex items-center gap-3 border-b border-slate-100 px-5">
          <Search className="size-5 text-brand-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Tapez un ID Externe (EPS-…), une page, une action…"
            className="h-16 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">Échap</kbd>
        </div>

        <div className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
          {commands.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">Aucun résultat</p>}
          {commands.map((c, i) => {
            const header = i === 0 || commands[i - 1].group !== c.group ? c.group : null;
            const selected = i === safeActive;
            const Icon = c.icon;
            return (
              <div key={c.id}>
                {header && <p className="px-3 pt-3 pb-1.5 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">{header}</p>}
                <button
                  onMouseMove={() => selected || setActive(i)}
                  onClick={() => run(c)}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    selected ? "bg-brand-50" : "hover:bg-slate-50",
                  )}
                >
                  {selected && <motion.span layoutId="palette-active" className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-brand-600" />}
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl transition-colors",
                      selected ? "bg-brand-600 text-white shadow-glow" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{c.label}</span>
                    {c.description && <span className="block truncate text-xs text-slate-500">{c.description}</span>}
                  </span>
                  {c.hint ? (
                    <kbd className="text-[10px] font-semibold text-slate-400">{c.hint}</kbd>
                  ) : (
                    selected && <ArrowRight className="size-4 text-brand-600" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white px-1 ring-1 ring-slate-200">↑</kbd>
            <kbd className="rounded bg-white px-1 ring-1 ring-slate-200">↓</kbd> naviguer
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> ouvrir
          </span>
        </div>
      </motion.div>
    </div>
  );
}
