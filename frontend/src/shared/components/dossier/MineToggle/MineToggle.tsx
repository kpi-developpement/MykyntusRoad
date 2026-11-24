"use client";

import { UserRound, UsersRound } from "lucide-react";
import type { DossierGrid } from "../../../hooks/useDossierGrid";
import { assigneeKey, type Team } from "../../../types";
import { SegmentedControl } from "../../segmented/SegmentedControl/SegmentedControl";

/** "Mes dossiers" (only the ones dispatched to me) / "Tous" (mine first, the others read only). */
export function MineToggle({ grid, team, username }: { grid: DossierGrid; team: Team; username: string }) {
  const key = assigneeKey(team);
  const filter = grid.criteria.filters.find((f) => f.key === key);
  const value = filter?.values?.length === 1 && filter.values[0] === username ? "mine" : filter ? null : "all";
  return (
    <SegmentedControl
      ariaLabel="Dossiers affichés"
      value={value}
      onChange={(v) => grid.setFilter(key, v === "mine" ? { key, values: [username] } : null)}
      options={[
        { value: "all", label: "Tous (les miens d'abord)", icon: UsersRound },
        { value: "mine", label: "Mes dossiers", icon: UserRound },
      ]}
    />
  );
}
