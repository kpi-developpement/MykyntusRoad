"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Pin, PinOff, Search, Sparkles } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useLayout } from "../../../context/LayoutContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { ROLE_LABELS } from "../../../types";
import { cn } from "../../../utils/cn";
import { isActivePath } from "../../../utils/nav";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { IconButton } from "../../button/IconButton/IconButton";
import { LiveDot } from "../../feedback/LiveDot/LiveDot";
import { BrandMark } from "../BrandMark/BrandMark";

const EXPANDED = 276;
const COLLAPSED = 84;
/** Delays of the hover intent: opens fast, closes a bit later (the cursor may leave by accident). */
const OPEN_DELAY = 70;
const CLOSE_DELAY = 260;
const resize = { duration: 0.32, ease: [0.32, 0.72, 0, 1] } as const;

/**
 * Desktop: slim icon rail that opens by itself when the cursor comes near (overlay, the page never
 * reflows: only clip-path / transform / opacity are animated). Ctrl + B or the pin keeps it open.
 * Mobile: drawer opened from the top bar.
 */
export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useLayout();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const pinned = !collapsed;
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = pinned || hover;

  const schedule = useCallback((next: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(next), next ? OPEN_DELAY : CLOSE_DELAY);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (desktop) {
    return (
      <motion.aside initial={false} animate={{ width: pinned ? EXPANDED : COLLAPSED }} transition={resize} className="relative z-40 h-full shrink-0">
        {/* hover zone a bit wider than the rail: opens when the cursor gets close */}
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: open ? EXPANDED : COLLAPSED + 14 }}
          onPointerEnter={(e) => e.pointerType === "mouse" && schedule(true)}
          onPointerLeave={() => schedule(false)}
          onFocusCapture={() => schedule(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) schedule(false);
          }}
        >
          {/* shadow following the edge while floating above the page */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-10 bg-linear-to-r from-night/25 to-transparent transition-[transform,opacity] duration-[340ms] ease-out-expo"
            style={{ left: EXPANDED, transform: `translateX(${open ? 0 : COLLAPSED - EXPANDED}px)`, opacity: open && !pinned ? 1 : 0 }}
          />
          <div className="sidebar-reveal absolute inset-y-0 left-0" data-open={open} style={{ width: EXPANDED }}>
            <SidebarPanel open={open} />
          </div>
          <button
            onClick={() => {
              toggleCollapsed();
              setHover(false);
            }}
            aria-label={pinned ? "Libérer la barre latérale" : "Épingler la barre latérale"}
            title={pinned ? "Libérer (Ctrl + B)" : "Garder ouverte (Ctrl + B)"}
            className={cn(
              "absolute top-[34px] z-50 grid size-7 place-items-center rounded-full bg-white text-brand-700 shadow-[0_0_0_4px_rgb(255_255_255/0.12),0_6px_16px_-4px_rgb(10_16_51/0.5)] ring-1 ring-brand-100",
              "transition-[transform,opacity] duration-300 ease-out-expo hover:scale-110",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            style={{ left: EXPANDED - 14, transform: `translateX(${open ? 0 : COLLAPSED - EXPANDED}px)` }}
          >
            {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
        </div>
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
            <SidebarPanel open onNavigate={() => setMobileOpen(false)} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Fades the parts that only make sense when open (labels, cards). */
const DELAYS = { 0: "", 75: "delay-75", 100: "delay-100" } as const;
const reveal = (open: boolean, delay: keyof typeof DELAYS = 0) =>
  cn("transition-opacity duration-300 ease-out-expo", open ? cn("opacity-100", DELAYS[delay]) : "pointer-events-none opacity-0");

/**
 * Laid out once at full width: every icon sits in the first 84 px, centred on x = 42,
 * so opening only reveals the labels (nothing moves, nothing reflows).
 */
function SidebarPanel({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { nav, setPaletteOpen } = useLayout();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const name = user?.fullName || user?.username || "";

  return (
    <div className="relative flex h-full flex-col text-white">
      {/* background (no blur filters) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(6_10_34/0.92)_0%,rgb(8_13_44/0.88)_55%,rgb(12_18_60/0.9)_100%)]" />
        <div className="grid-lines absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
        <div className="absolute -top-32 -left-32 size-96 bg-[radial-gradient(circle,rgb(34_211_238/0.16),transparent_62%)]" />
        <div className="absolute -right-40 bottom-[-6rem] size-96 bg-[radial-gradient(circle,rgb(139_92_246/0.2),transparent_62%)]" />
      </div>
      <span aria-hidden className="edge-beam" />

      {/* brand: mark centred on the rail */}
      <div className="relative flex h-[92px] shrink-0 items-center gap-3 pl-[22px]">
        <BrandMark variant="light" />
        <div className={cn("min-w-0 whitespace-nowrap", reveal(open, 75))}>
          <div className="font-display text-[18px] leading-tight font-semibold tracking-tight">MyKyntus</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.2em] text-sky-300/80 uppercase">
            <LiveDot tone="neon" className="size-1.5" /> Suivi · en ligne
          </div>
        </div>
      </div>

      {/* quick search */}
      <div className="relative mb-1 px-4">
        <button
          onClick={() => setPaletteOpen(true)}
          aria-label="Rechercher (Ctrl K)"
          className="group relative flex h-10 w-full items-center gap-2.5 rounded-xl pl-[18px] text-sm text-brand-100/75 transition-colors hover:text-white"
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-xl bg-white/[0.06] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] ring-1 ring-white/10 transition-[opacity,clip-path] duration-300 ease-out-expo group-hover:bg-white/[0.1]",
            )}
            style={{ clipPath: open ? "inset(0 0 0 0 round 12px)" : "inset(0 calc(100% - 52px) 0 0 round 12px)" }}
          />
          <Search className="relative size-4 shrink-0 transition-transform group-hover:scale-110" />
          <span className={cn("relative flex-1 text-left whitespace-nowrap", reveal(open, 75))}>Rechercher…</span>
          <kbd className={cn("relative mr-2 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-100 ring-1 ring-white/10", reveal(open, 75))}>
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* navigation */}
      <nav className="scroll-thin relative flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4">
        {nav.map((section, sIndex) => (
          <div key={section.title}>
            <div className="relative flex h-10 items-end pb-2">
              {/* slim: small divider on the rail / open: numbered title */}
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-3.5 left-[14px] h-px w-8 bg-linear-to-r from-transparent via-white/25 to-transparent transition-opacity duration-300",
                  open || sIndex === 0 ? "opacity-0" : "opacity-100",
                )}
              />
              <p className={cn("flex w-full items-center gap-2 px-3 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-brand-300/75 uppercase", reveal(open, 75))}>
                <span className="text-sky-300/80">{String(sIndex + 1).padStart(2, "0")}</span>
                {section.title}
                <span className="h-px flex-1 bg-linear-to-r from-white/15 to-transparent" />
              </p>
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      className={cn(
                        "group relative flex h-11 w-full items-center gap-3 rounded-xl pl-[20.5px] text-sm font-medium transition-colors duration-200",
                        active ? "text-white" : "text-slate-400 hover:text-white",
                      )}
                    >
                      {/* hover plate: square on the rail, full row when open */}
                      {!active && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-white/[0.07] opacity-0 transition-[opacity,clip-path] duration-300 ease-out-expo group-hover:opacity-100"
                          style={{ clipPath: open ? "inset(0 0 0 0 round 12px)" : "inset(0 calc(100% - 54px) 0 6px round 12px)" }}
                        />
                      )}
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-xl bg-linear-to-r from-cyan-400/[0.16] via-blue-500/[0.1] to-violet-500/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_0_0_1px_rgb(103_232_249/0.22),0_0_28px_-8px_rgb(34_211_238/0.65)] transition-[clip-path] duration-300 ease-out-expo"
                          style={{ clipPath: open ? "inset(0 0 0 0 round 12px)" : "inset(0 calc(100% - 54px) 0 6px round 12px)" }}
                          transition={{ type: "spring", stiffness: 460, damping: 38 }}
                        >
                          <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-cyan-300 to-violet-400 shadow-[0_0_14px_#22d3ee]" />
                        </motion.span>
                      )}
                      <Icon
                        className={cn(
                          "relative z-10 size-[19px] shrink-0 transition-transform duration-300 ease-out-expo",
                          active ? "text-cyan-300 drop-shadow-[0_0_6px_rgb(34_211_238/0.8)]" : "group-hover:scale-110",
                        )}
                      />
                      <span className={cn("relative z-10 truncate whitespace-nowrap", reveal(open, 75))}>{item.label}</span>
                      {active && (
                        <span className={cn("relative z-10 mr-3 ml-auto font-mono text-[9px] tracking-[0.18em] text-cyan-300/80 uppercase", reveal(open, 75))}>
                          actif
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className="relative shrink-0 px-4 pb-4">
        <div className={cn("mb-3 rounded-2xl bg-linear-to-br from-cyan-400/40 via-white/5 to-violet-400/35 p-px", reveal(open, 100))}>
          <div className="rounded-[15px] bg-[linear-gradient(160deg,#0b1236,#070b24)] p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.18em] text-sky-300 uppercase">
              <Sparkles className="size-3.5" />
              Astuce
            </div>
            <p className="mt-2 text-xs leading-relaxed whitespace-nowrap text-brand-100/85">
              <kbd className="rounded bg-white/10 px-1 font-semibold">Ctrl K</kbd> chercher ·{" "}
              <kbd className="rounded bg-white/10 px-1 font-semibold">Ctrl B</kbd> épingler le menu
            </p>
          </div>
        </div>

        {user && (
          <div className="relative flex items-center gap-3 p-1 pl-1.5">
            <span
              aria-hidden
              className={cn("absolute inset-0 rounded-2xl bg-white/[0.06] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] ring-1 ring-white/10", reveal(open))}
            />
            <Avatar1 name={name} className="relative" />
            <div className={cn("relative min-w-0 flex-1", reveal(open, 75))}>
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate font-mono text-[10px] tracking-wide text-brand-200/80">{ROLE_LABELS[user.role]}</p>
            </div>
            <span className={cn("relative", reveal(open, 75))}>
              <IconButton label="Se déconnecter" variant="dark" size="sm" tooltipSide="top" onClick={logout}>
                <LogOut />
              </IconButton>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
