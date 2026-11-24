"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronDown, LogOut, Menu, PanelLeft, Search } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useLayout } from "../../../context/LayoutContext";
import { ROLE_LABELS } from "../../../types";
import { formatDateLong, today } from "../../../utils/date";
import { findNavItem } from "../../../utils/nav";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { IconButton } from "../../button/IconButton/IconButton";
import { LiveDot } from "../../feedback/LiveDot/LiveDot";
import { FlagLegendButton } from "../../flag/FlagLegend/FlagLegend";
import { DropdownMenu } from "../../menu/DropdownMenu/DropdownMenu";

export function Topbar() {
  const { nav, setMobileOpen, setPaletteOpen, toggleCollapsed } = useLayout();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const current = findNavItem(nav, pathname);
  const CurrentIcon = current?.item.icon;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const name = user?.fullName || user?.username || "";

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 bg-[#060a22]/70 px-4 text-white backdrop-blur-md sm:px-6 lg:px-8">
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-cyan-300/40 to-transparent" />

      <IconButton label="Menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
        <Menu />
      </IconButton>

      <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-2.5 text-sm">
        {current && CurrentIcon && (
          <>
            <span className="hidden font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-cyan-300/70 uppercase sm:inline">{current.section.title}</span>
            <span className="hidden h-3.5 w-px rotate-12 bg-white/20 sm:inline" />
            <span className="flex min-w-0 items-center gap-2 font-semibold text-white">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30">
                <CurrentIcon className="size-3.5" />
              </span>
              <span className="truncate">{current.item.label}</span>
            </span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="group hidden h-10 w-72 items-center gap-2.5 rounded-xl bg-white/[0.05] px-3 text-sm text-slate-400 ring-1 ring-white/10 transition-[box-shadow,color] duration-300 ring-inset hover:text-slate-200 hover:shadow-[0_0_0_4px_rgb(34_211_238/0.08),0_0_24px_-8px_rgb(34_211_238/0.6)] hover:ring-cyan-300/40 md:flex"
        >
          <Search className="size-4 shrink-0 transition-colors group-hover:text-cyan-300" />
          <span className="truncate whitespace-nowrap">Rechercher un dossier…</span>
          <kbd className="ml-auto shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-slate-400 ring-1 ring-white/10">
            Ctrl K
          </kbd>
        </button>
        <IconButton label="Rechercher" className="md:hidden" onClick={() => setPaletteOpen(true)}>
          <Search />
        </IconButton>
        <FlagLegendButton />

        <span className="hidden h-10 items-center gap-2 rounded-xl bg-emerald-400/10 px-3 font-mono text-[10px] font-medium tracking-[0.16em] text-emerald-300 uppercase ring-1 ring-emerald-300/25 ring-inset 2xl:flex">
          <LiveDot /> Synchronisé
        </span>

        <div className="hidden h-10 items-center gap-2 rounded-xl bg-white/[0.05] px-3 text-xs font-medium whitespace-nowrap text-slate-300 ring-1 ring-white/10 ring-inset xl:flex">
          <CalendarDays className="size-4 text-cyan-300" />
          <span className="first-letter:uppercase">{formatDateLong(today())}</span>
        </div>

        <button
          onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
          className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-white/[0.06]"
          aria-label="Menu utilisateur"
        >
          <Avatar1 name={name} size="sm" />
          <span className="hidden max-w-32 truncate text-sm font-medium text-slate-200 sm:inline">{name}</span>
          <ChevronDown className="size-4 text-slate-500" />
        </button>
        <DropdownMenu
          anchor={menuAnchor}
          open={!!menuAnchor}
          onClose={() => setMenuAnchor(null)}
          header={
            user && (
              <div className="flex items-center gap-3">
                <Avatar1 name={name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="truncate font-mono text-[10px] tracking-wide text-slate-500">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>
            )
          }
          items={[
            { label: "Rechercher", icon: Search, hint: "Ctrl K", onSelect: () => setPaletteOpen(true) },
            { label: "Réduire / agrandir le menu", icon: PanelLeft, hint: "Ctrl B", onSelect: toggleCollapsed },
            { label: "Se déconnecter", icon: LogOut, tone: "danger", onSelect: logout },
          ]}
        />
      </div>
    </header>
  );
}
