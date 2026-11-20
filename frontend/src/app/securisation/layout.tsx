"use client";

import { RequireRole } from "@/shared/components/guard/RequireRole/RequireRole";
import { AppShell } from "@/shared/components/layout/AppShell/AppShell";
import { SECURISATION_NAV } from "@/securisation/navigation";

export default function SecurisationLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["ADMIN_SECURISATION"]}>
      <AppShell nav={SECURISATION_NAV}>{children}</AppShell>
    </RequireRole>
  );
}
