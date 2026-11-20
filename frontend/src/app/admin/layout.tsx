"use client";

import { ADMIN_NAV } from "@/admin/navigation";
import { RequireRole } from "@/shared/components/guard/RequireRole/RequireRole";
import { AppShell } from "@/shared/components/layout/AppShell/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["ADMIN"]}>
      <AppShell nav={ADMIN_NAV}>{children}</AppShell>
    </RequireRole>
  );
}
