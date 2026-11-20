"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Columns3, FileSpreadsheet } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { FileDropzone, type UploadPhase } from "@/shared/components/import/FileDropzone/FileDropzone";
import { Surface } from "@/shared/components/surface/Surface/Surface";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { secService } from "@/shared/services/secService";
import type { ImportResult, SecSource } from "@/shared/types";
import { formatDateTime, formatRelative } from "@/shared/utils/date";

interface SecSlotCardProps {
  source: SecSource;
  index: number;
  onImported: () => void;
}

/** One of the 3 sécurisation files: last import, new upload, quick result. */
export function SecSlotCard({ source, index, onImported }: SecSlotCardProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const last = source.lastImport;

  async function upload() {
    if (!file) return;
    setResult(null);
    setProgress(0);
    setPhase("uploading");
    try {
      const res = await secService.upload(source.slot, file, (ratio) => {
        setProgress(ratio);
        if (ratio >= 1) setPhase("processing");
      });
      setResult(res);
      setFile(null);
      toast.success(`Fichier ${source.slot} importé`, `${res.updatedRows} dossiers enrichis · ${res.createdRows} nouveaux`);
      onImported();
    } catch (e) {
      toast.error("Échec de l'import", e instanceof Error ? e.message : undefined);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}>
      <Surface corners className="flex h-full flex-col rounded-3xl p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-cyan-500 to-brand-700 font-display text-lg font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_24px_-10px_rgb(8_145_178/0.7)]">
              {source.slot}
            </span>
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-700 uppercase">Fichier sécurisation</p>
              <p className="font-display text-base font-semibold tracking-tight text-slate-950">Source {source.slot}</p>
            </div>
          </div>
          <span className="rounded-full bg-cyan-50 px-2.5 py-1 font-mono text-[10px] text-cyan-800 ring-1 ring-cyan-200">
            {source.visible}/{source.columns} colonnes
          </span>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50/80 px-3.5 py-3 ring-1 ring-slate-200/70 ring-inset">
          {last ? (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="size-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{last.fileName}</p>
                <p className="font-mono text-[10px] text-slate-500" title={formatDateTime(last.importedAt)}>
                  {formatRelative(last.importedAt)} · {last.importedBy} · {last.totalRows} lignes
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Aucun fichier importé pour l&apos;instant.</p>
          )}
        </div>

        <FileDropzone file={file} onFile={setFile} phase={phase} progress={progress} />

        {result && (
          <div className="mt-4 animate-fade-in rounded-2xl bg-emerald-50/70 px-3.5 py-3 text-xs text-emerald-900 ring-1 ring-emerald-200">
            <p className="font-semibold">
              {result.updatedRows} dossiers enrichis · {result.createdRows} nouveaux · {result.skippedRows} ignorés
            </p>
            <p className="mt-0.5">
              {result.columns.length} colonnes lues
              {result.newColumns.length > 0 && <>, dont {result.newColumns.length} nouvelle(s)</>}
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <LinkButton href="/securisation/colonnes" variant="ghost" size="sm" leftIcon={<Columns3 className="size-3.5" />}>
            Choisir les colonnes
          </LinkButton>
          <Button1 size="sm" onClick={upload} disabled={!file} loading={phase !== "idle"} rightIcon={phase === "idle" && <ArrowRight />}>
            Importer
          </Button1>
        </div>
      </Surface>
    </motion.div>
  );
}
