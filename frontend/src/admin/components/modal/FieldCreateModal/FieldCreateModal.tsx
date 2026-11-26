"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ListPlus } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Input1 } from "@/shared/components/input/Input1/Input1";
import { TagsInput } from "@/shared/components/input/TagsInput/TagsInput";
import { Modal1 } from "@/shared/components/modal/Modal1/Modal1";
import { SegmentedControl } from "@/shared/components/segmented/SegmentedControl/SegmentedControl";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import { fieldService } from "@/shared/services/fieldService";
import { SECTION_LABELS, type FieldSection, type FieldType } from "@/shared/types";
import { FIELD_TYPES, fieldTypeInfo } from "@/shared/utils/fieldTypes";

interface FieldCreateModalProps {
  open: boolean;
  /** Sections the current admin manages. */
  sections: FieldSection[];
  defaultSection: FieldSection;
  onClose: () => void;
  onCreated: (label: string) => void;
  onError: (message: string) => void;
}

export function FieldCreateModal({ open, sections, defaultSection, onClose, onCreated, onError }: FieldCreateModalProps) {
  return (
    <Modal1
      open={open}
      onClose={onClose}
      icon={
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <ListPlus className="size-5" />
        </span>
      }
      title="Nouvelle colonne"
      description="Elle apparaîtra dans le tableau de suivi, dans la section choisie."
    >
      {open && <CreateForm sections={sections} defaultSection={defaultSection} onClose={onClose} onCreated={onCreated} onError={onError} />}
    </Modal1>
  );
}

function CreateForm({ sections, defaultSection, onClose, onCreated, onError }: Omit<FieldCreateModalProps, "open">) {
  const [label, setLabel] = useState("");
  const [section, setSection] = useState<FieldSection>(defaultSection);
  const [type, setType] = useState<FieldType>("SELECT");
  const [values, setValues] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  // a new J-1 column opens with Cellule plani "Ouvert" (like Commentaire, Mail...)
  const [conditional, setConditional] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    try {
      const field = await fieldService.create({
        label: label.trim(),
        section,
        type,
        published: section === "SECURISATION" && published,
        planification: section === "J_MINUS_1" && conditional,
      });
      if (type === "SELECT") {
        for (const value of values) await fieldService.addOption(field.id, { value });
      }
      onCreated(field.label);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-2">
      <Input1 label="Nom de la colonne" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex : Motif de report" autoFocus />
      <div className="grid gap-5 sm:grid-cols-2">
        {sections.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Section</span>
            <SegmentedControl<FieldSection>
              value={section}
              onChange={setSection}
              options={sections.map((s) => ({ value: s, label: SECTION_LABELS[s] }))}
              className="w-fit"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Type</span>
          <SegmentedControl<FieldType>
            value={type}
            onChange={setType}
            options={FIELD_TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
            className="w-fit"
          />
          <span className="text-xs text-slate-500">{fieldTypeInfo(type).description}</span>
        </div>
      </div>
      {section === "SECURISATION" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-cyan-50/60 px-4 py-3 ring-1 ring-cyan-100">
          <div>
            <p className="text-sm font-semibold text-slate-800">Visible dans le suivi</p>
            <p className="text-xs text-slate-500">Affichée en lecture seule aux administrateurs et pilotes (comme « Etat final »).</p>
          </div>
          <Switch1 checked={published} onChange={setPublished} />
        </div>
      )}
      {section === "J_MINUS_1" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-violet-50/60 px-4 py-3 ring-1 ring-violet-100">
          <div>
            <p className="text-sm font-semibold text-slate-800">Seulement si Cellule plani « Ouvert »</p>
            <p className="text-xs text-slate-500">Cachée pour les dossiers « Planifié » (valeur par défaut à l&apos;import), comme Commentaire ou Mail.</p>
          </div>
          <Switch1 checked={conditional} onChange={setConditional} />
        </div>
      )}
      <AnimatePresence initial={false}>
        {type === "SELECT" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <TagsInput label="Valeurs de la liste" value={values} onChange={setValues} hint="Entrée ou virgule pour ajouter. Modifiables plus tard." />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-end gap-2 pt-2">
        <Button1 variant="secondary" onClick={onClose}>
          Annuler
        </Button1>
        <Button1 type="submit" loading={busy} disabled={!label.trim()}>
          Créer la colonne
        </Button1>
      </div>
    </form>
  );
}
