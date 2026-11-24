"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Info, Plus } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { SegmentedControl } from "@/shared/components/segmented/SegmentedControl/SegmentedControl";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { fieldService } from "@/shared/services/fieldService";
import { SECTION_LABELS, type AppField, type FieldSection } from "@/shared/types";
import { FieldCard } from "../../card/FieldCard/FieldCard";
import { FieldCreateModal } from "../../modal/FieldCreateModal/FieldCreateModal";

const RIGHTS: Record<FieldSection, string> = {
  SECURISATION: "Modifiable par l'admin sécurisation et les pilotes sécurisation. « Colonne J-1 » = passe à la planification quand la Cellule plani n'est pas « Planifié ».",
  J_MINUS_1: "Ancienne section J-1 (fusionnée dans Sécurisation).",
  PLANIFICATION: "Colonnes J-1 des dossiers non « Planifié » : agents planification et administrateur.",
  J: "Modifiable par l'administrateur et les agents J.",
  J_PLUS_1: "Modifiable par l'administrateur et les agents J.",
};

interface FieldsBoardProps {
  /** Sections managed by the current admin. */
  sections: FieldSection[];
}

/** Columns of the application for the given sections, with their dropdown values. */
export function FieldsBoard({ sections }: FieldsBoardProps) {
  const toast = useToast();
  const [fields, setFields] = useState<AppField[] | null>(null);
  const [section, setSection] = useState<FieldSection>(sections[0]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fieldService
      .list()
      .then(setFields)
      .catch((e: Error) => toast.error("Chargement impossible", e.message));
  }, [toast]);

  useEffect(load, [load]);

  const onError = useCallback((message: string) => toast.error("Action impossible", message), [toast]);
  const list = fields?.filter((f) => f.section === section) ?? [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {sections.length > 1 && (
            <SegmentedControl<FieldSection>
              value={section}
              onChange={setSection}
              ariaLabel="Section"
              options={sections.map((s) => ({ value: s, label: SECTION_LABELS[s], count: fields?.filter((f) => f.section === s).length }))}
            />
          )}
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="size-4 shrink-0 text-brand-500" />
            {RIGHTS[section]}
          </p>
        </div>
        <Button1 leftIcon={<Plus />} onClick={() => setCreating(true)}>
          Nouvelle colonne
        </Button1>
      </div>

      {fields === null ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200/70">
              <div className="flex gap-3">
                <Skeleton className="size-10 rounded-2xl" />
                <Skeleton className="h-5 flex-1" />
              </div>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-16" />
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3"
          >
            {list.map((f, i) => (
              <FieldCard key={`${f.id}-${f.label}`} field={f} index={i} onChanged={load} onError={onError} />
            ))}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: list.length * 0.04 + 0.1 }}
              onClick={() => setCreating(true)}
              className="group flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 transition-transform group-hover:scale-110 group-hover:bg-brand-100">
                <Plus className="size-6" />
              </span>
              <span className="text-sm font-semibold">Ajouter une colonne en {SECTION_LABELS[section]}</span>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      )}

      <FieldCreateModal
        open={creating}
        sections={sections}
        defaultSection={section}
        onClose={() => setCreating(false)}
        onCreated={(label) => {
          toast.success("Colonne créée", label);
          load();
        }}
        onError={onError}
      />
    </>
  );
}
