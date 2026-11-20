"use client";

import { useCallback, useEffect, useState } from "react";
import { secService } from "@/shared/services/secService";
import type { Pilote } from "@/shared/types";

/** Pilots of the sécurisation team (ADMIN_SECURISATION only). */
export function usePilotes(enabled = true) {
  const [pilotes, setPilotes] = useState<Pilote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    secService.pilotes().then(
      (list) => {
        if (!cancelled) {
          setPilotes(list);
          setError(null);
        }
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Chargement impossible"),
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, token]);

  const reload = useCallback(() => setToken((t) => t + 1), []);
  return { pilotes, setPilotes, error, reload };
}
