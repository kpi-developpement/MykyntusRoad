"use client";

import { motion } from "motion/react";
import { FileSpreadsheet } from "lucide-react";
import { Avatar1 } from "@/shared/components/avatar/Avatar1/Avatar1";
import { Badge1 } from "@/shared/components/badge/Badge1/Badge1";
import { EmptyState } from "@/shared/components/feedback/EmptyState/EmptyState";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { SOURCE_LABELS, type ImportBatch } from "@/shared/types";
import { formatDateTime, formatRelative } from "@/shared/utils/date";

/** History of the imported files, as a timeline. */
export function ImportTimeline({ batches }: { batches: ImportBatch[] | null }) {
  if (batches === null) {
    return (
      <div className="space-y-5 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return <EmptyState title="Aucun import pour le moment" description="Le premier fichier importé apparaîtra ici." />;
  }

  return (
    <ol className="p-2">
      {batches.map((b, i) => (
        <motion.li
          key={b.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i, 10) * 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="group relative flex gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-brand-50/50"
        >
          <div className="relative flex flex-col items-center">
            <span className="relative z-10 grid size-10 place-items-center rounded-xl bg-linear-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-[inset_0_1px_0_#fff] ring-1 ring-emerald-200/80 transition-transform duration-300 ease-out-expo group-hover:scale-105">
              <FileSpreadsheet className="size-5" />
              {i === 0 && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] ring-2 ring-white" />}
            </span>
            {i < batches.length - 1 && <span className="absolute top-12 -bottom-5 w-px bg-linear-to-b from-brand-200 via-slate-200 to-transparent" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-900">{b.fileName}</p>
              <time className="shrink-0 font-mono text-[11px] text-slate-400" title={formatDateTime(b.importedAt)}>
                {formatRelative(b.importedAt)}
              </time>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Avatar1 name={b.importedBy} size="sm" className="size-5 text-[8px] ring-1" />
              {b.importedBy} · {b.totalRows} lignes
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge1 tone="emerald">+{b.createdRows} créés</Badge1>
              <Badge1 tone="brand">{b.updatedRows} mis à jour</Badge1>
              {b.source !== "MAIN" && <Badge1 tone="sky">{SOURCE_LABELS[b.source]}</Badge1>}
              {b.skippedRows > 0 && <Badge1 tone="amber">{b.skippedRows} ignorés</Badge1>}
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
