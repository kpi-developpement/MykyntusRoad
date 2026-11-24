"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Workflow } from "lucide-react";
import { SecDispatchPage } from "@/securisation/pages/SecDispatchPage/SecDispatchPage";
import { SegmentedControl } from "@/shared/components/segmented/SegmentedControl/SegmentedControl";
import { today, tomorrow } from "@/shared/utils/date";

type AdminTeam = "PLANIFICATION" | "J";

/** Dispatch of the admin's teams: planification agents (dossiers not "Planifié") and J / J+1 agents. */
export function DispatchPage() {
  const params = useSearchParams();
  const [team, setTeam] = useState<AdminTeam>(params.get("team") === "PLANIFICATION" ? "PLANIFICATION" : "J");
  const batch = params.get("batch") ? Number(params.get("batch")) : null;
  const date = params.get("date");

  const toggle = (
    <SegmentedControl<AdminTeam>
      value={team}
      onChange={setTeam}
      ariaLabel="Équipe"
      options={[
        { value: "J", label: "Agents J / J+1", icon: CalendarClock },
        { value: "PLANIFICATION", label: "Planification", icon: Workflow },
      ]}
    />
  );

  return (
    <SecDispatchPage
      key={team}
      team={team}
      eyebrow={team === "J" ? "Agents J / J+1" : "Planification"}
      description={
        team === "J"
          ? "Choisissez les agents : les dossiers du jour sont répartis à parts égales, drapeaux compris. Chaque agent voit ses dossiers en premier."
          : "Seuls les dossiers dont la « Cellule plani » n'est pas « Planifié » sont répartis entre les agents planification choisis."
      }
      pilotesHref="/admin/utilisateurs"
      initialDate={date ?? (batch ? "" : team === "J" ? today() : tomorrow())}
      initialBatch={batch}
      headerExtra={toggle}
    />
  );
}
