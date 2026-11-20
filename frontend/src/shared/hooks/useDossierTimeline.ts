"use client";

import { useEffect, useState } from "react";
import { dossierService } from "../services/dossierService";
import type { DossierTimeline } from "../types";

/** Loads the life cycle of a dossier (null id = nothing to load). */
export function useDossierTimeline(dossierId: number | null) {
  const [state, setState] = useState<{ id: number | null; data: DossierTimeline | null; error: string | null }>({
    id: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (dossierId === null) return;
    let cancelled = false;
    dossierService.timeline(dossierId).then(
      (data) => {
        if (!cancelled) setState({ id: dossierId, data, error: null });
      },
      (e: unknown) => {
        if (!cancelled) setState({ id: dossierId, data: null, error: e instanceof Error ? e.message : "Erreur" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [dossierId]);

  const current = state.id === dossierId;
  return { timeline: current ? state.data : null, error: current ? state.error : null, loading: dossierId !== null && !current };
}
