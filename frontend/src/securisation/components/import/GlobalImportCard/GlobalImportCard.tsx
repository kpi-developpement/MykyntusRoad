"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, Database, FileSpreadsheet, Flag, Shuffle } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { FlagBadge } from "@/shared/components/flag/FlagBadge/FlagBadge";
import { FileDropzone, type UploadPhase } from "@/shared/components/import/FileDropzone/FileDropzone";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { useFlags } from "@/shared/hooks/useFlags";
import { useTilt } from "@/shared/hooks/useTilt";
import { dossierService } from "@/shared/services/dossierService";
import { secService } from "@/shared/services/secService";
import type { FacetValue, ImportResult, SecSource } from "@/shared/types";
import { formatDateTime, formatRelative, tomorrow } from "@/shared/utils/date";

interface GlobalImportCardProps {
  source: SecSource | undefined;
  onImported: () => void;
}

/**
 * Option 2: the global file (every dossier of the day). Each dossier gets its flags right away
 * (Type de commande, Score client, Motif de sécurisation, Gardé en Main).
 */
export function GlobalImportCard({ source, onImported }: GlobalImportCardProps) {
  const toast = useToast();
  const { byCode } = useFlags();
  const tilt = useTilt<HTMLDivElement>(3);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [flagCounts, setFlagCounts] = useState<FacetValue[] | null>(null);
  const last = source?.lastImport;

  // flags of the dossiers of the chosen date (refreshed after each import)
  useEffect(() => {
    let cancelled = false;
    dossierService
      .facets({ date, search: "", filters: [], sort: null, page: 0, size: 1 }, "flags", "")
      .then((f) => !cancelled && setFlagCounts(f.values))
      .catch(() => !cancelled && setFlagCounts([]));
    return () => {
      cancelled = true;
    };
  }, [date, result]);

  async function upload() {
    if (!file) return;
    setResult(null);
    setProgress(0);
    setPhase("uploading");
    try {
      const res = await secService.upload(
        0,
        file,
        (ratio) => {
          setProgress(ratio);
          if (ratio >= 1) setPhase("processing");
        },
        date || undefined,
      );
      setResult(res);
      setFile(null);
      toast.success("Fichier global importé", `${res.createdRows} nouveaux · ${res.updatedRows} mis à jour · drapeaux calculés`);
      onImported();
    } catch (e) {
      toast.error("Échec de l'import", e instanceof Error ? e.message : undefined);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }} className="mb-6">
      <div ref={tilt} className="tilt surface-pop relative overflow-hidden rounded-[28px]">
        <span aria-hidden className="tilt-glare" />
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          {/* left: hero + drop zone */}
          <div className="relative p-6 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <span className="tilt-pop grid size-12 place-items-center rounded-2xl bg-linear-to-br from-brand-500 via-brand-700 to-night text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_14px_30px_-10px_rgb(37_72_234/0.8)]">
                <Database className="size-6" />
              </span>
              <div>
                <p className="font-mono text-[10px] tracking-[0.22em] text-brand-600 uppercase">Fichier global</p>
                <p className="font-display text-lg font-semibold tracking-tight text-slate-950">Tous les dossiers, avec leurs drapeaux</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
                <CalendarDays className="size-4 text-brand-500" />
                <span className="text-slate-500">Date des dossiers</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent font-mono text-sm text-slate-900 outline-none" />
              </label>
              {last && (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500" title={formatDateTime(last.importedAt)}>
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  <span className="max-w-48 truncate font-medium text-slate-700">{last.fileName}</span> · {formatRelative(last.importedAt)}
                </span>
              )}
            </div>

            <FileDropzone file={file} onFile={setFile} phase={phase} progress={progress} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Un dossier déjà connu est mis à jour ; ses drapeaux modifiés à la main sont conservés.</p>
              <Button1 onClick={upload} disabled={!file} loading={phase !== "idle"} rightIcon={phase === "idle" && <ArrowRight />}>
                Importer le fichier global
              </Button1>
            </div>
          </div>

          {/* right: flags of the day */}
          <div className="relative overflow-hidden bg-[linear-gradient(160deg,#0b1347,#14206e_55%,#1d37d7)] p-6 text-white sm:p-7">
            <div aria-hidden className="grid-lines absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_70%_20%,black,transparent_70%)]" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-sky-300 uppercase">
                  <Flag className="size-3.5" /> Drapeaux détectés
                </p>
                <span className="font-mono text-[10px] text-brand-200">{date ? `le ${date.split("-").reverse().join("/")}` : "toutes dates"}</span>
              </div>

              {result && (
                <div className="mb-4 grid animate-scale-in grid-cols-3 gap-2 text-center">
                  {[
                    ["Nouveaux", result.createdRows],
                    ["Mis à jour", result.updatedRows],
                    ["Ignorés", result.skippedRows],
                  ].map(([label, n]) => (
                    <div key={label} className="rounded-2xl bg-white/[0.07] py-2 ring-1 ring-white/10">
                      <p className="font-display text-xl font-bold tabular-nums">{n}</p>
                      <p className="font-mono text-[9px] tracking-[0.16em] text-brand-200 uppercase">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {flagCounts === null ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-6 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : flagCounts.length === 0 ? (
                <p className="rounded-2xl bg-white/[0.06] p-4 text-sm text-brand-100/80 ring-1 ring-white/10">
                  Aucun drapeau pour cette date. Importez le fichier global : P1, P2, MIG, TH, SECU, GRE, R1, R2, R3&+, RTI et GEM sont détectés automatiquement.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {flagCounts.slice(0, 11).map((f, i) => {
                    const max = flagCounts[0].count || 1;
                    return (
                      <li key={f.value} className="flex animate-slide-up items-center gap-3" style={{ animationDelay: `${i * 35}ms` }}>
                        <span className="w-16 shrink-0">
                          <FlagBadge code={f.value} flag={byCode.get(f.value)} size="xs" />
                        </span>
                        <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-linear-to-r from-sky-400 to-white transition-transform duration-700 ease-out-expo"
                            style={{ transform: `scaleX(${f.count / max})` }}
                          />
                        </span>
                        <span className="w-10 text-right font-mono text-xs tabular-nums">{f.count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <LinkButton href="/securisation/dispatch" variant="secondary" leftIcon={<Shuffle />} className="mt-5 w-full justify-center">
                Répartir entre les pilotes
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
