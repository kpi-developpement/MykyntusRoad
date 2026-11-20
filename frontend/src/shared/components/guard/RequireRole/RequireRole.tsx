"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useAuth } from "../../../context/AuthContext";
import { BrandLoader } from "../../layout/BrandLoader/BrandLoader";
import type { Role } from "../../../types";

interface RequireRoleProps {
  roles: Role[];
  children: React.ReactNode;
}

/** Redirects to /login when not authenticated, or to the user's home when the role is not allowed. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!roles.includes(user.role)) router.replace(homeFor(user.role));
  }, [user, loading, roles, router]);

  if (loading || !allowed) return <BrandLoader />;
  return <>{children}</>;
}
