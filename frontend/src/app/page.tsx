"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLoader } from "@/shared/components/layout/BrandLoader/BrandLoader";
import { homeFor, useAuth } from "@/shared/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? homeFor(user.role) : "/login");
  }, [user, loading, router]);
  return <BrandLoader />;
}
