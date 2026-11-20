"use client";

import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { MAIN_SECTIONS } from "@/shared/types";
import { FieldsBoard } from "../../components/fields/FieldsBoard/FieldsBoard";

/** Admin defines the J-1 / J / J+1 columns and the values allowed in each dropdown. */
export function ChampsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Colonnes & valeurs"
        description="Définissez les colonnes de l'application et les valeurs proposées dans chaque liste déroulante. La sécurisation est gérée par son admin."
        icon={<SlidersHorizontal />}
      />
      <FieldsBoard sections={MAIN_SECTIONS} />
    </>
  );
}
