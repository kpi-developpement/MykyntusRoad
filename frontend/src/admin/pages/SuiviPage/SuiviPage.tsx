"use client";

import { CloudUpload, LayoutDashboard } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import { tomorrow } from "@/shared/utils/date";

export function SuiviPage() {
  const importButton = (
    <LinkButton href="/admin/import" leftIcon={<CloudUpload />}>
      Importer un fichier
    </LinkButton>
  );
  return (
    <SuiviView
      gridId="admin-suivi"
      eyebrow="Pilotage"
      title="Suivi des dossiers"
      description="Vue complète J-1 / J / J+1. Filtrez chaque colonne, cliquez sur un ID Externe pour ouvrir le dossier."
      icon={<LayoutDashboard />}
      initialDate={tomorrow()}
      actions={importButton}
      emptyAction={importButton}
    />
  );
}
