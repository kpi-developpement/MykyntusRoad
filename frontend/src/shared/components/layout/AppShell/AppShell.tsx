"use client";

import { useCallback } from "react";
import { LayoutProvider, useLayout } from "../../../context/LayoutContext";
import { useHotkey, withMod } from "../../../hooks/useHotkey";
import type { NavSection } from "../../../types/navigation";
import { CommandPalette } from "../../command/CommandPalette/CommandPalette";
import { GridFloor } from "../GridFloor/GridFloor";
import { PageTransition } from "../PageTransition/PageTransition";
import { Sidebar } from "../Sidebar/Sidebar";
import { Topbar } from "../Topbar/Topbar";

interface AppShellProps {
  nav: NavSection[];
  children: React.ReactNode;
}

const ctrlB = withMod("b");
const ctrlK = withMod("k");

/** Application frame: sidebar + top bar + animated page area + command palette. */
export function AppShell({ nav, children }: AppShellProps) {
  return (
    <LayoutProvider nav={nav}>
      <Frame>{children}</Frame>
    </LayoutProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { toggleCollapsed, paletteOpen, setPaletteOpen } = useLayout();
  const togglePalette = useCallback(() => setPaletteOpen(!paletteOpen), [paletteOpen, setPaletteOpen]);
  useHotkey(ctrlB, toggleCollapsed);
  useHotkey(ctrlK, togglePalette);

  return (
    <div className="app-canvas flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <GridFloor />
        <Topbar />
        <main className="scroll-thin relative flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <PageTransition>
            <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </PageTransition>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
