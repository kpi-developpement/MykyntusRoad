"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CloudUpload, FileSpreadsheet, X } from "lucide-react";
import { IconButton } from "@/shared/components/button/IconButton/IconButton";
import { cn } from "@/shared/utils/cn";

export type UploadPhase = "idle" | "uploading" | "processing";

interface FileDropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  phase: UploadPhase;
  /** 0..1 while uploading. */
  progress: number;
  accept?: string;
}

/** HUD brackets in the four corners of the drop zone. */
const CORNERS = [
  "top-4 left-4 border-t-2 border-l-2 rounded-tl-lg group-hover:-translate-x-1 group-hover:-translate-y-1",
  "top-4 right-4 border-t-2 border-r-2 rounded-tr-lg group-hover:translate-x-1 group-hover:-translate-y-1",
  "bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg group-hover:-translate-x-1 group-hover:translate-y-1",
  "bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg group-hover:translate-x-1 group-hover:translate-y-1",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function FileDropzone({ file, onFile, phase, progress, accept = ".xlsx,.xls,.xlsm" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = phase !== "idle";
  const pct = Math.round(progress * 100);

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {!file ? (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={cn(
              "group relative flex w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center",
              "transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out-expo",
              over
                ? "scale-[1.01] border-sky-400 bg-brand-50 shadow-[0_0_0_6px_rgb(56_189_248/0.12),0_20px_40px_-20px_rgb(37_72_234/0.6)]"
                : "border-brand-200 bg-linear-to-b from-white to-brand-50/60 hover:border-brand-400 hover:bg-brand-50/70",
            )}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(37_72_234/0.1)_1px,transparent_1px)] [background-size:18px_18px] opacity-70" />
            {CORNERS.map((c) => (
              <span key={c} aria-hidden className={cn("pointer-events-none absolute size-4 border-sky-400/80 transition-transform duration-500 ease-out-expo", c)} />
            ))}
            {over && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scan bg-linear-to-b from-transparent via-sky-300/30 to-transparent" />}
            <motion.span
              animate={over ? { y: -8, scale: 1.1, rotate: -4 } : { y: 0, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="relative grid size-16 place-items-center rounded-2xl bg-linear-to-br from-brand-400 via-brand-600 to-brand-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_14px_30px_-10px_rgb(37_72_234/0.75)]"
            >
              <span aria-hidden className="absolute -inset-2.5 rounded-[22px] border border-dashed border-brand-300/80 group-hover:animate-spin-slow" />
              <CloudUpload className="size-7" />
            </motion.span>
            <span className="relative">
              <span className="block font-display text-base font-semibold tracking-tight text-slate-900">
                {over ? "Relâchez pour déposer le fichier" : "Glissez-déposez votre fichier Excel"}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                ou <span className="font-semibold text-brand-600 underline-offset-2 group-hover:underline">parcourez vos fichiers</span>
                <span className="font-mono text-[11px] text-slate-400"> · .xlsx .xls · 50 Mo max</span>
              </span>
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="surface relative overflow-hidden rounded-3xl p-5"
          >
            {busy && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 animate-scan bg-linear-to-b from-transparent via-sky-200/40 to-transparent" />}
            <div className="relative flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-[inset_0_1px_0_#fff] ring-1 ring-emerald-200/80">
                <FileSpreadsheet className="size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {formatSize(file.size)} · {phase === "idle" ? "Prêt à importer" : phase === "uploading" ? "Envoi en cours…" : "Analyse en cours…"}
                </p>
              </div>
              {!busy && (
                <IconButton label="Retirer le fichier" onClick={() => onFile(null)}>
                  <X />
                </IconButton>
              )}
            </div>
            <AnimatePresence>
              {busy && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    {phase === "uploading" ? (
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-700"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    ) : (
                      <div className="h-full w-1/3 animate-progress rounded-full bg-linear-to-r from-brand-400 to-brand-700" />
                    )}
                  </div>
                  <p className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{phase === "uploading" ? "Envoi du fichier au serveur" : "Lecture des colonnes et des lignes"}</span>
                    {phase === "uploading" && <span className="font-semibold text-slate-700 tabular-nums">{pct}%</span>}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
