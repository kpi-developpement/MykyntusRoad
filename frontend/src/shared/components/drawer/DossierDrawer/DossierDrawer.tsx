"use client";

import { useState } from "react";
import { ClipboardList, Copy, Database, Route } from "lucide-react";
import type { AppField, DossierRow, SourceColumn } from "../../../types";
import { SECTION_LABELS, SECTIONS, SOURCE_LABELS } from "../../../types";
import { cn } from "../../../utils/cn";
import { formatDate, formatDateLong } from "../../../utils/date";
import { SECTION_THEME } from "../../../utils/sectionTheme";
import { ValueChip } from "../../badge/ValueChip/ValueChip";
import { IconButton } from "../../button/IconButton/IconButton";
import { DossierLifecycle } from "../../dossier/DossierLifecycle/DossierLifecycle";
import { SegmentedControl } from "../../segmented/SegmentedControl/SegmentedControl";
import { useToast } from "../../toast/ToastProvider/ToastProvider";
import { isIdExterneColumn } from "../../table/DossierTable/commonColumns";
import { Drawer1 } from "../Drawer1/Drawer1";

type Tab = "cycle" | "data";

interface DossierDrawerProps {
  row: DossierRow | null;
  columns: SourceColumn[];
  fields: AppField[];
  onClose: () => void;
}

/** Everything about one dossier: its life cycle (road map + history) and its data. */
export function DossierDrawer({ row, columns, fields, onClose }: DossierDrawerProps) {
  const toast = useToast();
  // keep the last dossier displayed during the closing animation
  const [shown, setShown] = useState(row);
  const [tab, setTab] = useState<Tab>("cycle");
  if (row && row !== shown) {
    setShown(row);
    setTab("cycle");
  }

  const copy = async () => {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(shown.idExterne);
      toast.success("ID copié", shown.idExterne);
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <Drawer1
      open={!!row}
      onClose={onClose}
      title={<span className="font-mono">{shown?.idExterne}</span>}
      subtitle={shown && <span className="first-letter:uppercase">{formatDateLong(shown.date)}</span>}
      actions={
        <IconButton label="Copier l'ID" variant="dark" size="sm" onClick={copy}>
          <Copy />
        </IconButton>
      }
    >
      {shown && (
        <div className="px-6 py-5">
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            className="mb-5"
            options={[
              { value: "cycle", label: "Cycle de vie", icon: Route },
              { value: "data", label: "Données", icon: Database },
            ]}
          />
          {tab === "cycle" ? <DossierLifecycle key={shown.id} dossierId={shown.id} /> : <DossierData row={shown} columns={columns} fields={fields} />}
        </div>
      )}
    </Drawer1>
  );
}

function DossierData({ row, columns, fields }: { row: DossierRow; columns: SourceColumn[]; fields: AppField[] }) {
  const sources = [...new Set(columns.map((c) => c.source))];
  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
          <ClipboardList className="size-4" /> Suivi
        </h4>
        <div className="space-y-3">
          {SECTIONS.map((section) => {
            // the conditional J-1 columns only exist once Cellule plani is "Ouvert"
            const list = fields.filter((f) => f.section === section && (!f.planification || row.planification));
            if (list.length === 0) return null;
            return (
              <div key={section} className={cn("overflow-hidden rounded-2xl ring-1", SECTION_THEME[section].ring)}>
                <div className={cn("px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase", SECTION_THEME[section].header)}>
                  {SECTION_LABELS[section]}
                </div>
                <dl className="divide-y divide-slate-100 bg-white">
                  {list.map((f) => {
                    const value = row.values[f.id];
                    return (
                      <div key={f.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                        <dd className="min-w-0 text-right">
                          {!value ? (
                            <span className="text-slate-300">—</span>
                          ) : f.type === "SELECT" ? (
                            <ValueChip value={value} />
                          ) : (
                            <span className="text-sm text-slate-800">{f.type === "DATE" ? formatDate(value) : value}</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {sources.map((source) => (
        <section key={source}>
          <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
            <Database className="size-4" /> {source === "MAIN" ? "Données importées" : SOURCE_LABELS[source]}
          </h4>
          <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
            {columns
              .filter((c) => c.source === source && !isIdExterneColumn(c.label))
              .map((c) => (
                <div key={c.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 transition-colors hover:bg-slate-50">
                  <dt className="text-xs font-medium text-slate-500">{c.label}</dt>
                  <dd className="text-sm font-medium break-words text-slate-800">{row.raw[c.name] ?? <span className="font-normal text-slate-300">—</span>}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
