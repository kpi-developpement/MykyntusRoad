"use client";

import { CloudUpload, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { SuiviView } from "@/shared/pages/SuiviView/SuiviView";
import { SEC_SOURCES, SECURISATION_SECTIONS } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";

/**
 * Work space of the sécurisation team: Date | EPS | columns chosen from the 3 files |
 * Sécurisation (date, pilote, département, commentaire, état final) | J-1.
 */
export function SecWorkspacePage({ canImport = false }: { canImport?: boolean }) {
  const importButton = canImport ? (
    <LinkButton href="/securisation/imports" leftIcon={<CloudUpload />}>
      Importer les fichiers
    </LinkButton>
  ) : undefined;

  return (
    <SuiviView
      gridId="sec-espace"
      eyebrow="Sécurisation"
      title="Espace sécurisation"
      description="Dossiers du lendemain. Pilote et date de traitement se remplissent automatiquement ; l'état final est visible par toute l'équipe."
      icon={<ShieldCheck />}
      initialDate={tomorrow()}
      sections={SECURISATION_SECTIONS}
      rawSources={SEC_SOURCES}
      rawHidden={false}
      actions={importButton}
      emptyAction={importButton}
    />
  );
}
