"use client";

import { useCallback, useEffect, useState } from "react";
import { Columns3, Eye, EyeOff } from "lucide-react";
import { Card1 } from "@/shared/components/card/Card1/Card1";
import { EmptyState } from "@/shared/components/feedback/EmptyState/EmptyState";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { SearchInput } from "@/shared/components/input/SearchInput/SearchInput";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { importService } from "@/shared/services/importService";
import { SEC_SOURCES, SOURCE_LABELS, type SourceColumn } from "@/shared/types";
import { cn } from "@/shared/utils/cn";
import { SECTION_THEME, sourceGroup } from "@/shared/utils/sectionTheme";

/** Choose which columns of the 3 files are displayed in the sécurisation space (for everybody). */
export function SourceColumnsPanel() {
  const toast = useToast();
  const [columns, setColumns] = useState<SourceColumn[] | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    importService
      .sourceColumns()
      .then(setColumns)
      .catch((e: Error) => toast.error("Chargement impossible", e.message));
  }, [toast]);

  useEffect(load, [load]);

  async function setVisible(targets: SourceColumn[], visible: boolean) {
    const ids = new Set(targets.map((c) => c.id));
    setColumns((list) => list?.map((c) => (ids.has(c.id) ? { ...c, visible } : c)) ?? null);
    try {
      await Promise.all(targets.map((c) => importService.setColumnVisible(c.id, visible)));
    } catch (e) {
      toast.error("Modification impossible", e instanceof Error ? e.message : undefined);
      load();
    }
  }

  const match = (c: SourceColumn) => c.label.toLowerCase().includes(q.trim().toLowerCase());

  return (
    <Card1
      title="Colonnes des fichiers"
      subtitle="Les colonnes cochées apparaissent dans l'espace sécurisation"
      icon={<Columns3 />}
      actions={<SearchInput value={q} onChange={setQ} placeholder="Chercher une colonne…" className="w-60" />}
    >
      {columns === null ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <EmptyState title="Aucune colonne pour l'instant" description="Importez un fichier sécurisation : ses colonnes apparaîtront ici." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {SEC_SOURCES.map((source) => {
            const all = columns.filter((c) => c.source === source);
            const list = all.filter(match);
            const visible = all.filter((c) => c.visible).length;
            return (
              <section key={source} className="overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
                <header className={cn("relative flex items-center justify-between gap-2 px-4 py-2.5", SECTION_THEME[sourceGroup(source)].header)}>
                  <span aria-hidden className="stripes absolute inset-0" />
                  <span className="relative font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">{SOURCE_LABELS[source]}</span>
                  <span className="relative font-mono text-[10px]">
                    {visible}/{all.length}
                  </span>
                </header>
                {all.length > 0 && (
                  <div className="flex gap-1 border-b border-slate-100 px-2 py-1.5">
                    <button onClick={() => setVisible(all, true)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                      <Eye className="size-3.5" /> Tout afficher
                    </button>
                    <button onClick={() => setVisible(all, false)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                      <EyeOff className="size-3.5" /> Tout masquer
                    </button>
                  </div>
                )}
                <ul className="scroll-thin max-h-80 divide-y divide-slate-100 overflow-y-auto bg-white">
                  {list.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-400">{all.length ? "Aucun résultat" : "Pas encore importé"}</li>}
                  {list.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
                      <span className={cn("truncate text-sm", c.visible ? "font-medium text-slate-800" : "text-slate-400")}>{c.label}</span>
                      <Switch1 size="sm" checked={c.visible} onChange={(v) => setVisible([c], v)} label={undefined} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Card1>
  );
}
