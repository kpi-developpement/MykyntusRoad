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
    <header className="relative z-30 mx-3 mt-3 flex h-14 shrink-0 items-center gap-3 rounded-[20px] border border-white/70 bg-white/55 px-3 text-slate-900 shadow-[inset_0_1px_0_#fff,0_10px_30px_-18px_rgb(20_33_61/0.35)] backdrop-blur-xl sm:px-4 lg:ml-0">
      <span aria-hidden className="absolute inset-x-6 bottom-0 h-px bg-linear-to-r from-transparent via-[#2F6BFF]/25 to-transparent" />

      <IconButton label="Menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
        <Menu />
      </IconButton>

      <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-2.5 text-sm">
        {current && CurrentIcon && (
          <>
            <span className="hidden font-mono text-[11px] whitespace-nowrap text-slate-400 sm:inline">{current.section.title}</span>
            <span className="hidden h-3.5 w-px rotate-12 bg-slate-300 sm:inline" />
            <span className="flex min-w-0 items-center gap-2 font-semibold text-[#14213D]">
              <span className="grid size-7 shrink-0 place-items-center rounded-[10px] bg-[#EEF2F8] text-[#2F6BFF] shadow-[-3px_-3px_6px_#fff,3px_3px_8px_rgb(100_116_160/0.25)]">
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
          className="group hidden h-10 w-72 items-center gap-2.5 rounded-[14px] bg-[#EEF2F8] px-3 text-sm text-slate-400 shadow-[inset_2px_2px_5px_rgb(100_116_160/0.22),inset_-2px_-2px_5px_#fff] transition-[box-shadow,color] duration-200 hover:text-slate-600 md:flex"
        >
          <Search className="size-4 shrink-0 transition-colors group-hover:text-[#2F6BFF]" />
          <span className="truncate whitespace-nowrap">Rechercher un dossier…</span>
          <kbd className="ml-auto shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-slate-500 shadow-[0_1px_2px_rgb(15_23_42/0.08)]">
            Ctrl K
          </kbd>
        </button>
        <IconButton label="Rechercher" className="md:hidden" onClick={() => setPaletteOpen(true)}>
          <Search />
        </IconButton>
        <FlagLegendButton />

        <span className="hidden h-10 items-center gap-2 rounded-[14px] bg-[#12B5A6]/10 px-3 text-xs font-medium text-[#0E8F84] 2xl:flex">
          <LiveDot /> Synchronisé
        </span>

        <div className="hidden h-10 items-center gap-2 rounded-[14px] bg-white/70 px-3 text-xs font-medium whitespace-nowrap text-slate-600 xl:flex">
          <CalendarDays className="size-4 text-[#2F6BFF]" />
          <span className="first-letter:uppercase">{formatDateLong(today())}</span>
        </div>

        <button
          onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
          className="flex items-center gap-2 rounded-[14px] p-1 pr-2 transition-colors hover:bg-white/80"
          aria-label="Menu utilisateur"
        >
          <Avatar1 name={name} size="sm" />
          <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 sm:inline">{name}</span>
          <ChevronDown className="size-4 text-slate-400" />
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
