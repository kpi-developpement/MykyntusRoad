"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, History } from "lucide-react";
import { Card1 } from "@/shared/components/card/Card1/Card1";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { ImportTimeline } from "@/shared/components/import/ImportTimeline/ImportTimeline";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { secService } from "@/shared/services/secService";
import type { ImportBatch, SecSource } from "@/shared/types";
import { GlobalImportCard } from "../../components/import/GlobalImportCard/GlobalImportCard";
import { SecSlotCard } from "../../components/import/SecSlotCard/SecSlotCard";

/** Global file (every dossier + flags) and the 3 sécurisation files that enrich the dossiers (matched by EPS). */
export function SecImportsPage() {
  const toast = useToast();
  const [sources, setSources] = useState<SecSource[] | null>(null);
  const [history, setHistory] = useState<ImportBatch[] | null>(null);

  const load = useCallback(() => {
    secService
      .sources()
      .then(setSources)
      .catch((e: Error) => toast.error("Chargement impossible", e.message));
    secService
      .history()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [toast]);

  useEffect(load, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Sécurisation"
        title="Fichiers sécurisation"
        description="Le fichier global apporte tous les dossiers et leurs drapeaux. Les 3 fichiers complètent les dossiers (rattachés par l'EPS) avec leurs propres colonnes."
        icon={<CloudUpload />}
      />

      {sources === null ? (
        <Skeleton className="mb-6 h-[26rem] rounded-[28px]" />
      ) : (
        <GlobalImportCard source={sources.find((s) => s.slot === 0)} onImported={load} />
      )}

      <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.24em] text-brand-600 uppercase">
        <span className="h-px w-6 bg-linear-to-r from-brand-600 to-sky-400" />
        Fichiers complémentaires
      </h2>
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        {sources === null
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-3xl" />)
          : sources
              .filter((s) => s.slot > 0)
              .map((s, i) => <SecSlotCard key={s.slot} source={s} index={i} onImported={load} />)}
      </div>

      <Card1 title="Historique" subtitle="Derniers fichiers sécurisation importés" icon={<History />} bodyClassName="scroll-thin max-h-[28rem] overflow-y-auto">
        <ImportTimeline batches={history} />
      </Card1>
    </>
  );
}
