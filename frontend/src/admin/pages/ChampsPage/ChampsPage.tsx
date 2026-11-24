"use client";

import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { ADMIN_FIELD_SECTIONS } from "@/shared/types";
import { FieldsBoard } from "../../components/fields/FieldsBoard/FieldsBoard";

/** Admin defines the J-1 / J / J+1 columns and the values allowed in each dropdown. */
export function ChampsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Colonnes & valeurs"
        description="Définissez les colonnes J-1 / J / J+1 et les valeurs proposées dans chaque liste déroulante. Les colonnes J-1 sont partagées avec l'admin sécurisation : quand un dossier n'est pas sécurisé, elles passent à la planification."
        icon={<SlidersHorizontal />}
      />
      <FieldsBoard sections={ADMIN_FIELD_SECTIONS} />
    </>
  );
}
