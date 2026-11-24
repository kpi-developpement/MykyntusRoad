"use client";

import { useEffect, useState } from "react";
import { teamService } from "../services/teamService";
import type { Pilote, Team } from "../types";

/** Members of the given teams (names in the tables, choices of the assignment cells). */
export function useTeamPilotes(teams: Team[]) {
  const key = teams.join(",");
  const [pilotes, setPilotes] = useState<Partial<Record<Team, Pilote[]>>>({});

  useEffect(() => {
    let cancelled = false;
    const list = key ? (key.split(",") as Team[]) : [];
    Promise.all(list.map((t) => teamService.pilotes(t).then((p) => [t, p] as const))).then(
      (entries) => !cancelled && setPilotes(Object.fromEntries(entries)),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  return pilotes;
}
