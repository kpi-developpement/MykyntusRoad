"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { ValueChip } from "@/shared/components/badge/ValueChip/ValueChip";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider/ConfirmProvider";
import { SegmentedControl } from "@/shared/components/segmented/SegmentedControl/SegmentedControl";
import { Surface } from "@/shared/components/surface/Surface/Surface";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import { fieldService } from "@/shared/services/fieldService";
import { FIELD_TYPES, fieldTypeInfo } from "@/shared/utils/fieldTypes";
import { CELLULE_PLANI, type AppField, type FieldType } from "@/shared/types";
import { cn } from "@/shared/utils/cn";

interface FieldCardProps {
  field: AppField;
  index: number;
  /** Sécurisation admin: may publish a column and move it in / out of J-1 (the admin only edits the J-1 ones). */
  secAdmin?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

/** One application column: name, type, active flag and dropdown values. */
export function FieldCard({ field, index, secAdmin = false, onChanged, onError }: FieldCardProps) {
  const confirm = useConfirm();
  const [label, setLabel] = useState(field.label);
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);
  const activeOptions = field.options.filter((o) => o.active).length;
  const TypeIcon = fieldTypeInfo(field.type).icon;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const updateField = (patch: Partial<{ label: string; type: FieldType; active: boolean; published: boolean; planification: boolean }>) =>
    run(() =>
      fieldService.update(field.id, {
        label: patch.label ?? field.label,
        section: field.section,
        type: patch.type ?? field.type,
        position: field.position,
        active: patch.active ?? field.active,
        published: patch.published ?? field.published,
        planification: patch.planification ?? field.planification,
      }),
    );

  const addOption = () => {
    const value = newValue.trim();
    if (!value) return;
    run(async () => {
      await fieldService.addOption(field.id, { value });
      setNewValue("");
    });
  };

  const removeField = async () => {
    const ok = await confirm({
      title: `Supprimer la colonne « ${field.label} » ?`,
      description: "Toutes les valeurs déjà saisies dans cette colonne seront supprimées. Cette action est définitive.",
      confirmLabel: "Supprimer",
    });
    if (ok) run(() => fieldService.remove(field.id));
  };

  const removeOption = async (optionId: number, value: string) => {
    const ok = await confirm({
      title: `Supprimer la valeur « ${value} » ?`,
      description: "Les dossiers qui ont déjà cette valeur la conservent. Pour simplement la masquer, désactivez-la.",
      confirmLabel: "Supprimer",
    });
    if (ok) run(() => fieldService.removeOption(field.id, optionId));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
      className={cn(!field.active && "opacity-75 saturate-50")}
    >
      <Surface spotlight className="group flex h-full flex-col rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl shadow-[inset_0_1px_0_#fff] ring-1 transition-colors",
              field.type === "SELECT" ? "bg-linear-to-br from-brand-50 to-brand-100 text-brand-600 ring-brand-100" : "bg-linear-to-br from-violet-50 to-violet-100 text-violet-600 ring-violet-100",
            )}
          >
            <TypeIcon className="size-5" />
          </span>
          <div className="group/title relative min-w-0 flex-1">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => label.trim() && label !== field.label && updateField({ label: label.trim() })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full rounded-lg bg-transparent px-1.5 py-0.5 pr-7 font-display text-[15px] font-semibold tracking-tight text-slate-950 ring-1 ring-transparent transition-shadow hover:ring-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
              aria-label="Nom de la colonne"
            />
            <Pencil className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-300 opacity-0 transition group-hover/title:opacity-100" />
            <p className="mt-0.5 px-1.5 font-mono text-[10px] text-slate-400">{field.code}</p>
          </div>
          <Switch1 checked={field.active} disabled={busy} onChange={(active) => updateField({ active })} label={field.active ? "Active" : "Inactive"} size="sm" />
        </div>

        <div className="mt-4">
          <SegmentedControl<FieldType>
            size="sm"
            value={field.type}
            onChange={(type) => type !== field.type && updateField({ type })}
            options={FIELD_TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
          />
        </div>

        {secAdmin && field.section === "SECURISATION" && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-cyan-50/60 px-3 py-2 ring-1 ring-cyan-100">
            <span className="text-xs font-medium text-slate-600">Visible dans le suivi (lecture seule)</span>
            <Switch1 size="sm" checked={field.published} disabled={busy} onChange={(published) => updateField({ published })} />
          </div>
        )}
        {field.section === "J_MINUS_1" && field.code !== CELLULE_PLANI && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-violet-50/60 px-3 py-2 ring-1 ring-violet-100">
            <span className="text-xs font-medium text-slate-600" title="Fermée tant que la Cellule plani vaut « Planifié », ouverte quand elle passe à « Ouvert »">
              Seulement si Cellule plani « Ouvert »
            </span>
            <Switch1 size="sm" checked={field.planification} disabled={busy} onChange={(planification) => updateField({ planification })} />
          </div>
        )}

        {field.type === "SELECT" ? (
          <div className="mt-5 flex-1">
            <p className="mb-2.5 flex items-center justify-between font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
              Valeurs possibles
              <span className="font-semibold tracking-normal text-slate-400 normal-case tabular-nums">
                {activeOptions}/{field.options.length} actives
              </span>
            </p>
            <div className="flex min-h-9 flex-wrap gap-1.5">
              {field.options.length === 0 && (
                <p className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400">
                  Aucune valeur : ajoutez la première ci-dessous
                </p>
              )}
              <AnimatePresence initial={false}>
                {field.options.map((o) => (
                  <motion.span
                    key={o.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group/opt inline-flex"
                  >
                    <ValueChip value={o.value} className={cn("transition", !o.active && "opacity-50 grayscale [&>span:nth-child(2)]:line-through")}>
                      <span className="-mr-1 ml-0.5 hidden items-center group-hover/opt:inline-flex">
                        <button
                          type="button"
                          title={o.active ? "Désactiver (masquer dans les listes)" : "Activer"}
                          disabled={busy}
                          onClick={() => run(() => fieldService.updateOption(field.id, o.id, { value: o.value, active: !o.active }))}
                          className="grid size-5 place-items-center rounded-full hover:bg-black/10"
                        >
                          {o.active ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          disabled={busy}
                          onClick={() => removeOption(o.id, o.value)}
                          className="grid size-5 place-items-center rounded-full hover:bg-black/10"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    </ValueChip>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addOption()}
                placeholder="Nouvelle valeur…"
                className="h-9 min-w-0 flex-1 rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-slate-200 transition ring-inset placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <Button1 size="sm" className="h-9" leftIcon={<Plus />} onClick={addOption} disabled={!newValue.trim()} loading={busy}>
                Ajouter
              </Button1>
            </div>
          </div>
        ) : (
          <p className="mt-5 flex-1 rounded-2xl bg-violet-50/60 px-4 py-3 text-xs leading-relaxed text-violet-800 ring-1 ring-violet-100">
            {fieldTypeInfo(field.type).description}
          </p>
        )}

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <Button1 variant="ghost" size="xs" leftIcon={<Trash2 />} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={busy} onClick={removeField}>
            Supprimer la colonne
          </Button1>
        </div>
      </Surface>
    </motion.div>
  );
}
