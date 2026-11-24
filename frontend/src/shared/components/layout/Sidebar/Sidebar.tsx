"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Pin, PinOff, Search } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useLayout } from "../../../context/LayoutContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { ROLE_LABELS } from "../../../types";
import { isActivePath } from "../../../utils/nav";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { BrandMark } from "../BrandMark/BrandMark";
import styles from "./Sidebar.module.css";

/** Space kept for the rail / the pinned sheet (12px margin each side). */
const RAIL = 76 + 24;
const SHEET = 264 + 24;
/** Hover intent: opens fast, closes a bit later (the cursor may leave by accident). */
const OPEN_DELAY = 70;
const CLOSE_DELAY = 240;
/** Critically damped spring: the active pill glides, never wobbles. */
const PILL = { type: "spring", stiffness: 520, damping: 44, mass: 0.9 } as const;

/**
 * Desktop: floating glass rail that morphs into a sheet when the cursor comes near (above the page,
 * no reflow; only clip-path / transform / opacity move). Ctrl + B or the pin keeps it open.
 * Mobile: the same sheet as a drawer.
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
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (desktop) {
    return (
      <aside className={`${styles.reserve} ${open ? styles.open : ""}`} style={{ width: pinned ? SHEET : RAIL }}>
        <div
          className={styles.zone}
          style={{ width: open ? SHEET : RAIL + 8 }}
          onPointerEnter={(e) => e.pointerType === "mouse" && schedule(true)}
          onPointerLeave={() => schedule(false)}
          onFocusCapture={() => schedule(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) schedule(false);
          }}
        >
          <span aria-hidden className={styles.shadow} />
          <SidebarPanel open={open} />
          <button
            type="button"
            className={styles.pin}
            onClick={() => {
              toggleCollapsed();
              setHover(false);
            }}
            aria-label={pinned ? "Libérer la barre latérale" : "Garder la barre latérale ouverte"}
            title={pinned ? "Libérer (Ctrl + B)" : "Garder ouverte (Ctrl + B)"}
          >
            {pinned ? <PinOff /> : <Pin />}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <AnimatePresence>
      {mobileOpen && (
        <>
          <motion.div
            className={styles.mobileBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={() => setMobileOpen(false)}
          />
          <motion.aside
            className={`${styles.mobilePanel} ${styles.open}`}
            initial={{ x: "-104%" }}
            animate={{ x: 0 }}
            exit={{ x: "-104%", transition: { duration: 0.15, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ type: "spring", stiffness: 420, damping: 42 }}
          >
            <SidebarPanel open onNavigate={() => setMobileOpen(false)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Laid out once at full width: every key sits in the first 76px of the panel,
 * so opening only uncovers the labels.
 */
function SidebarPanel({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { nav, setPaletteOpen } = useLayout();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const name = user?.fullName || user?.username || "";
  let index = 0;

  return (
    <div className={styles.panel} data-open={open}>
      <div className={styles.brand}>
        <BrandMark />
        <div className={`${styles.brandText} ${styles.label}`} style={{ "--i": 0 } as React.CSSProperties}>
          <div className={styles.brandName}>MyKyntus</div>
          <div className={styles.brandSub}>Suivi des dossiers</div>
        </div>
      </div>

      <button type="button" className={styles.search} onClick={() => setPaletteOpen(true)} aria-label="Rechercher (Ctrl K)">
        <Search aria-hidden />
        <span className={styles.label} style={{ "--i": 1 } as React.CSSProperties}>
          Rechercher
        </span>
        <span className={`${styles.kbd} ${styles.label}`} style={{ "--i": 1 } as React.CSSProperties}>
          Ctrl K
        </span>
      </button>

      <nav className={`${styles.nav} scroll-thin`} aria-label="Navigation principale">
        {nav.map((section) => (
          <div key={section.title}>
            <div className={styles.sectionTitle}>
              <span aria-hidden className={styles.sectionTick} />
              <span className={styles.label} style={{ "--i": index } as React.CSSProperties}>
                {section.title}
              </span>
            </div>
            <ul className={styles.list}>
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                const i = ++index;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      title={open ? undefined : item.label}
                      className={`${styles.item} ${active ? styles.active : ""}`}
                    >
                      {active && open && <motion.span layoutId="sidebar-pill" className={styles.pill} transition={PILL} />}
                      <span className={styles.key}>
                        <Icon aria-hidden />
                      </span>
                      <span className={`${styles.itemLabel} ${styles.label}`} style={{ "--i": i } as React.CSSProperties}>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className={styles.footer}>
          <div className={styles.user}>
            <span aria-hidden className={styles.userCard} />
            <Avatar1 name={name} className="relative" />
            <div className={`${styles.userText} ${styles.label}`} style={{ "--i": index + 1 } as React.CSSProperties}>
              <div className={styles.userName}>{name}</div>
              <div className={styles.userRole}>{ROLE_LABELS[user.role]}</div>
            </div>
            <span className={styles.label} style={{ "--i": index + 2 } as React.CSSProperties}>
              <button type="button" className={styles.iconKey} onClick={logout} aria-label="Se déconnecter" title="Se déconnecter">
                <LogOut />
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
