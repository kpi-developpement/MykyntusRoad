"use client";

import { Shuffle, Workflow } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import type { ColumnFilter, FieldSection, Team } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";

const SECTIONS: FieldSection[] = ["PLANIFICATION"];
const FILTERS: ColumnFilter[] = [{ key: "route", values: ["PLANIFICATION"] }];
const TEAMS: { team: Team; editable: boolean }[] = [{ team: "PLANIFICATION", editable: true }];

/** Dossiers the sécurisation team did not plan ("Cellule plani" not "Planifié"): their J-1 columns go to the planification agents. */
export function PlanificationPage() {
  const dispatch = (
    <LinkButton href="/admin/dispatch?team=PLANIFICATION" leftIcon={<Shuffle />}>
      Dispatcher
    </LinkButton>
  );
  return (
    <SuiviView
      gridId="admin-planif"
      eyebrow="Planification"
      title="Dossiers à planifier"
      description="Dossiers dont la « Cellule plani » n'est pas « Planifié ». Attribuez-les à un agent d'un clic, ou répartissez-les automatiquement depuis le dispatch."
      icon={<Workflow />}
      initialDate={tomorrow()}
      initialFilters={FILTERS}
      sections={SECTIONS}
      teams={TEAMS}
      actions={dispatch}
    />
  );
}
