"use client";

import { PILOTE_NAV } from "@/pilote/navigation";
import { RequireRole } from "@/shared/components/guard/RequireRole/RequireRole";
import { AppShell } from "@/shared/components/layout/AppShell/AppShell";

export default function PiloteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["PILOTE_SECURISATION", "PILOTE_J"]}>
      <AppShell nav={PILOTE_NAV}>{children}</AppShell>
    </RequireRole>
  );
}
