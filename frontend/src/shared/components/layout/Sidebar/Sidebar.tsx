"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, LogOut, Search, Sparkles } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useLayout } from "../../../context/LayoutContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { ROLE_LABELS } from "../../../types";
import { cn } from "../../../utils/cn";
import { isActivePath } from "../../../utils/nav";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { IconButton } from "../../button/IconButton/IconButton";
import { LiveDot } from "../../feedback/LiveDot/LiveDot";
import { Tooltip } from "../../tooltip/Tooltip/Tooltip";
import { BrandMark } from "../BrandMark/BrandMark";

const EXPANDED = 276;
const COLLAPSED = 84;
/** Short tween: fewer layout frames than a spring while the page reflows. */
const resize = { duration: 0.32, ease: [0.32, 0.72, 0, 1] } as const;
const fade = { duration: 0.18 } as const;

/** Desktop: collapsible column (Ctrl + B). Mobile: drawer opened from the top bar. */
export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useLayout();
  const desktop = useMediaQuery("(min-width: 1024px)");

  if (desktop) {
    return (
      <motion.aside initial={false} animate={{ width: collapsed ? COLLAPSED : EXPANDED }} transition={resize} className="relative z-40 h-full shrink-0">
        <SidebarPanel collapsed={collapsed} />
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
          title="Ctrl + B"
          className="absolute top-[38px] -right-3 z-50 grid size-6 place-items-center rounded-full bg-white text-brand-700 shadow-[0_0_0_4px_rgb(255_255_255/0.12),0_6px_16px_-4px_rgb(10_16_51/0.5)] ring-1 ring-brand-100 transition-transform duration-300 hover:scale-115"
        >
          <ChevronLeft className={cn("size-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </motion.aside>
    );
  }

  return (
    <AnimatePresence>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-night/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
          <motion.aside
            className="absolute inset-y-0 left-0 w-[290px] max-w-[86vw]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={resize}
          >
            <SidebarPanel collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function SidebarPanel({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { nav, setPaletteOpen } = useLayout();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const name = user?.fullName || user?.username || "";

  return (
    <div className="relative flex h-full flex-col text-white">
      {/* background, clipped in its own layer so tooltips can overflow the panel (no blur filters) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#080d2e_0%,#101a63_48%,#1a2a9c_100%)]" />
        <div className="grid-lines absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
        <div className="absolute -top-32 -left-32 size-96 bg-[radial-gradient(circle,rgb(59_102_245/0.5),transparent_62%)]" />
        <div className="absolute -right-40 bottom-[-6rem] size-96 bg-[radial-gradient(circle,rgb(56_189_248/0.2),transparent_62%)]" />
      </div>
      <span aria-hidden className="edge-beam" />

      {/* brand */}
      <div className={cn("relative flex h-[92px] shrink-0 items-center gap-3", collapsed ? "justify-center" : "px-6")}>
        <BrandMark variant="light" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={fade} className="min-w-0 whitespace-nowrap">
              <div className="font-display text-[18px] leading-tight font-semibold tracking-tight">MyKyntus</div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.2em] text-sky-300/80 uppercase">
                <LiveDot tone="neon" className="size-1.5" /> Suivi · en ligne
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* quick search */}
      <div className={cn("relative mb-1", collapsed ? "flex justify-center" : "px-4")}>
        {collapsed ? (
          <IconButton label="Rechercher (Ctrl K)" variant="dark" tooltipSide="right" onClick={() => setPaletteOpen(true)}>
            <Search />
          </IconButton>
        ) : (
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex h-10 w-full items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 text-sm text-brand-100/75 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] ring-1 ring-white/10 transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            <Search className="size-4 transition-transform group-hover:scale-110" />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-100 ring-1 ring-white/10">Ctrl K</kbd>
          </button>
        )}
      </div>

      {/* navigation */}
      <nav className={cn("relative flex-1 px-3 pb-4", collapsed ? "overflow-visible" : "scroll-thin overflow-y-auto")}>
        {nav.map((section, sIndex) => (
          <div key={section.title}>
            {collapsed ? (
              sIndex > 0 && <div className="mx-auto my-3 h-px w-8 bg-linear-to-r from-transparent via-white/20 to-transparent" />
            ) : (
              <p className="flex items-center gap-2 px-3 pt-6 pb-2 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-brand-300/75 uppercase">
                <span className="text-sky-300/80">{String(sIndex + 1).padStart(2, "0")}</span>
                {section.title}
                <span className="h-px flex-1 bg-linear-to-r from-white/15 to-transparent" />
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Tooltip label={item.label} side="right" disabled={!collapsed} className="w-full">
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl text-sm font-medium transition-colors duration-200",
                          collapsed ? "justify-center" : "px-3",
                          active ? "text-slate-900" : "text-brand-100/75 hover:bg-white/[0.07] hover:text-white",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-xl bg-linear-to-r from-white to-brand-50 shadow-[inset_0_1px_0_#fff,0_12px_30px_-12px_rgb(56_189_248/0.7)]"
                            transition={{ type: "spring", stiffness: 460, damping: 38 }}
                          >
                            <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sky-400 shadow-[0_0_12px_#38bdf8]" />
                          </motion.span>
                        )}
                        <Icon
                          className={cn(
                            "relative z-10 size-[19px] shrink-0 transition-transform duration-300 ease-out-expo",
                            active ? "text-brand-600" : "group-hover:translate-x-0.5 group-hover:scale-110",
                          )}
                        />
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              transition={fade}
                              className="relative z-10 truncate whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {active && !collapsed && (
                          <span className="relative z-10 ml-auto font-mono text-[9px] tracking-[0.18em] text-brand-500 uppercase">actif</span>
                        )}
                      </Link>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className={cn("relative shrink-0 pb-4", collapsed ? "flex flex-col items-center gap-2" : "px-4")}>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={fade}>
              <div className="mb-3 rounded-2xl bg-linear-to-br from-sky-400/45 via-white/10 to-brand-400/35 p-px">
                <div className="rounded-[15px] bg-[linear-gradient(160deg,#121b5e,#0c1446)] p-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.18em] text-sky-300 uppercase">
                    <Sparkles className="size-3.5" />
                    Astuce
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-brand-100/85">
                    <kbd className="rounded bg-white/10 px-1 font-semibold">Ctrl K</kbd> chercher un dossier ·{" "}
                    <kbd className="rounded bg-white/10 px-1 font-semibold">Ctrl B</kbd> réduire le menu
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {user &&
          (collapsed ? (
            <>
              <Tooltip label={name} side="right">
                <Avatar1 name={name} />
              </Tooltip>
              <IconButton label="Se déconnecter" variant="dark" tooltipSide="right" onClick={logout}>
                <LogOut />
              </IconButton>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] ring-1 ring-white/10">
              <Avatar1 name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate font-mono text-[10px] tracking-wide text-brand-200/80">{ROLE_LABELS[user.role]}</p>
              </div>
              <IconButton label="Se déconnecter" variant="dark" size="sm" tooltipSide="top" onClick={logout}>
                <LogOut />
              </IconButton>
            </div>
          ))}
      </div>
    </div>
  );
}
