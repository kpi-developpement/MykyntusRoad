"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import type { NavSection } from "../types/navigation";

interface LayoutState {
  nav: NavSection[];
  /**
   * Desktop sidebar pinned open? When not pinned (default) it stays slim and opens by itself
   * while the cursor is over it, above the page (no reflow).
   */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile sidebar drawer. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** Command palette (Ctrl + K). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** Dossier search requested from the palette, consumed by the dossier table. */
  pendingSearch: { q: string; id: number } | null;
  requestSearch: (q: string) => void;
  clearPendingSearch: () => void;
}

const LayoutContext = createContext<LayoutState | null>(null);

export function LayoutProvider({ nav, children }: { nav: NavSection[]; children: React.ReactNode }) {
  // new key: everybody starts with the slim sidebar that opens on hover
  const [collapsed, setCollapsed] = useLocalStorageState("mykyntus.sidebar.slim", true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ q: string; id: number } | null>(null);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);
  const requestSearch = useCallback((q: string) => setPendingSearch((p) => ({ q, id: (p?.id ?? 0) + 1 })), []);
  const clearPendingSearch = useCallback(() => setPendingSearch(null), []);

  const value = useMemo(
    () => ({
      nav,
      collapsed,
      toggleCollapsed,
      mobileOpen,
      setMobileOpen,
      paletteOpen,
      setPaletteOpen,
      pendingSearch,
      requestSearch,
      clearPendingSearch,
    }),
    [nav, collapsed, toggleCollapsed, mobileOpen, paletteOpen, pendingSearch, requestSearch, clearPendingSearch],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutState {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used inside LayoutProvider");
  return ctx;
}
