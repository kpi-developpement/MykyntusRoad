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
import { SecSlotCard } from "../../components/import/SecSlotCard/SecSlotCard";

/** The 3 sécurisation files: each one enriches the dossiers (matched by EPS) with its own columns. */
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
        description="Importez les 3 fichiers. Chaque ligne est rattachée à son dossier par l'EPS ; ses colonnes deviennent disponibles dans l'espace sécurisation."
        icon={<CloudUpload />}
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        {sources === null
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-3xl" />)
          : sources.map((s, i) => <SecSlotCard key={s.slot} source={s} index={i} onImported={load} />)}
      </div>

      <Card1 title="Historique" subtitle="Derniers fichiers sécurisation importés" icon={<History />} bodyClassName="scroll-thin max-h-[28rem] overflow-y-auto">
        <ImportTimeline batches={history} />
      </Card1>
    </>
  );
}
