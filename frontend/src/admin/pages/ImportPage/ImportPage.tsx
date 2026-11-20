"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarDays, CloudUpload, Columns3, Fingerprint, History, ShieldCheck } from "lucide-react";
import { Alert1 } from "@/shared/components/alert/Alert1/Alert1";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Card1 } from "@/shared/components/card/Card1/Card1";
import { Input1 } from "@/shared/components/input/Input1/Input1";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { Surface } from "@/shared/components/surface/Surface/Surface";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { importService } from "@/shared/services/importService";
import type { ImportBatch, ImportResult } from "@/shared/types";
import { tomorrow } from "@/shared/utils/date";
import { ImportResultCard } from "@/shared/components/import/ImportResultCard/ImportResultCard";
import { ImportTimeline } from "@/shared/components/import/ImportTimeline/ImportTimeline";
import { FileDropzone, type UploadPhase } from "@/shared/components/import/FileDropzone/FileDropzone";

const TIPS = [
  { icon: Columns3, title: "Colonnes dynamiques", text: "Toute nouvelle colonne du fichier est ajoutée et affichée automatiquement." },
  { icon: Fingerprint, title: "1 ligne = 1 dossier", text: "Identifié par « Ordre de travail: ID Externe »." },
  { icon: ShieldCheck, title: "Saisies conservées", text: "Un ré-import met à jour le dossier sans toucher aux valeurs saisies." },
];

export function ImportPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [forceDate, setForceDate] = useState(false);
  const [date, setDate] = useState(tomorrow);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportBatch[] | null>(null);

  const loadHistory = useCallback(() => {
    importService
      .history()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  useEffect(loadHistory, [loadHistory]);

  async function upload() {
    if (!file) return;
    setError(null);
    setResult(null);
    setProgress(0);
    setPhase("uploading");
    try {
      const res = await importService.upload(file, forceDate ? date : undefined, (ratio) => {
        setProgress(ratio);
        if (ratio >= 1) setPhase("processing");
      });
      setResult(res);
      setFile(null);
      toast.success("Import terminé", `${res.createdRows} nouveaux dossiers · ${res.updatedRows} mis à jour`);
      loadHistory();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de l'import";
      setError(message);
      toast.error("Échec de l'import", message);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Données"
        title="Import de fichier"
        description="Déposez l'export Excel du jour : les colonnes sont détectées automatiquement et chaque ligne devient un dossier."
        icon={<CloudUpload />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AnimatePresence mode="wait" initial={false}>
            {result ? (
              <ImportResultCard key="result" result={result} onReset={() => setResult(null)} />
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card1 title="Nouveau fichier" subtitle="Formats acceptés : .xlsx, .xls" icon={<CloudUpload />} bodyClassName="space-y-5 p-5">
                  <FileDropzone file={file} onFile={setFile} phase={phase} progress={progress} />

                  <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70 ring-inset">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-white text-brand-600 shadow-soft ring-1 ring-slate-200">
                          <CalendarDays className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Forcer la date des dossiers</p>
                          <p className="text-xs text-slate-500">Sinon lue dans « Date » ou « Début de la fenêtre d&apos;arrivée ».</p>
                        </div>
                      </div>
                      <Switch1 checked={forceDate} onChange={setForceDate} label={forceDate ? "Activé" : "Désactivé"} />
                    </div>
                    <AnimatePresence initial={false}>
                      {forceDate && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <Input1 type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-4 w-56" aria-label="Date des dossiers" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {error && (
                    <Alert1 tone="error" title="Import impossible" onClose={() => setError(null)}>
                      {error}
                    </Alert1>
                  )}

                  <div className="flex justify-end">
                    <Button1 size="lg" onClick={upload} disabled={!file} loading={phase !== "idle"} rightIcon={phase === "idle" && <ArrowRight className="transition-transform group-hover/btn:translate-x-0.5" />}>
                      {phase === "idle" ? "Importer le fichier" : phase === "uploading" ? "Envoi…" : "Analyse…"}
                    </Button1>
                  </div>
                </Card1>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4 sm:grid-cols-3">
            {TIPS.map((tip, i) => (
              <motion.div key={tip.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
                <Surface spotlight interactive className="h-full rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-brand-50 to-brand-100 text-brand-600 shadow-[inset_0_1px_0_#fff] ring-1 ring-brand-100">
                      <tip.icon className="size-[18px]" />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-slate-300">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-3 font-display text-sm font-semibold tracking-tight text-slate-950">{tip.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{tip.text}</p>
                </Surface>
              </motion.div>
            ))}
          </div>
        </div>

        <Card1 title="Historique des imports" subtitle="Les 50 derniers fichiers" icon={<History />} bodyClassName="scroll-thin max-h-[calc(100dvh-16rem)] overflow-y-auto">
          <ImportTimeline batches={history} />
        </Card1>
      </div>
    </>
  );
}
