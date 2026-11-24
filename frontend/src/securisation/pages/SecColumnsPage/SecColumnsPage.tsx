"use client";

import { SlidersHorizontal } from "lucide-react";
import { FieldsBoard } from "@/admin/components/fields/FieldsBoard/FieldsBoard";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { SEC_FIELD_SECTIONS } from "@/shared/types";
import { SourceColumnsPanel } from "../../components/columns/SourceColumnsPanel/SourceColumnsPanel";

/** Sécurisation admin: columns shown from the 3 files + the sécurisation columns and their values. */
export function SecColumnsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sécurisation"
        title="Colonnes & valeurs"
        description="Choisissez les colonnes des fichiers à afficher, puis gérez les colonnes de travail des pilotes et leurs listes de valeurs."
        icon={<SlidersHorizontal />}
      />
      <div className="mb-10">
        <SourceColumnsPanel />
      </div>
      <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.24em] text-brand-600 uppercase">
        <span className="h-px w-6 bg-linear-to-r from-brand-600 to-sky-400" />
        Colonnes de travail
      </h2>
      <FieldsBoard sections={SEC_FIELD_SECTIONS} />
    </>
  );
}
