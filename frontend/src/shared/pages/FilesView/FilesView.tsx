"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { FileSpreadsheet, Files, Search, ShieldCheck, Shuffle, TableProperties, Undo2 } from "lucide-react";
import { useConfirm } from "../../components/confirm/ConfirmProvider/ConfirmProvider";
import { PageHeader } from "../../components/layout/PageHeader/PageHeader";
import { useToast } from "../../components/toast/ToastProvider/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/dashboardService";
import { SOURCE_LABELS, type BatchSummary } from "../../types";
import { formatDate, formatDateTime } from "../../utils/date";
import styles from "./FilesView.module.css";

type Kind = "all" | "main" | "sec";
type State = "active" | "cancelled" | "all";

/** Where the dossiers of a file are shown / dispatched again, depending on who looks. */
export function fileLinks(b: BatchSummary, isSecAdmin: boolean) {
  const main = b.source === "MAIN";
  const table = isSecAdmin ? `/securisation/espace?batch=${b.id}` : `/admin/suivi?batch=${b.id}`;
  // the admin dispatches the J agents (his file), the sécurisation admin his pilots (sécurisation files)
  const dispatch = isSecAdmin ? (main ? null : `/securisation/dispatch?batch=${b.id}`) : main ? `/admin/dispatch?team=J&batch=${b.id}` : null;
  return { table, dispatch };
}

/**
 * Every file injected (admin's file and sécurisation files): name, date, author, what became of its
 * dossiers (closed / on time / orange / red), and per file: see its dossiers, dispatch again the ones
 * not treated, or cancel it when it was injected by mistake.
 */
export function FilesView() {
  const { user } = useAuth();
  const isSecAdmin = user?.role === "ADMIN_SECURISATION";
  const toast = useToast();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>(isSecAdmin ? "sec" : "all");
  const [state, setState] = useState<State>("active");
  const [token, setToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    dashboardService.batches(300).then(
      (list) => !cancelled && setBatches(list),
      (e: Error) => !cancelled && toast.error("Chargement impossible", e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  const shown = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (batches ?? []).filter(
      (b) =>
        (kind === "all" || (kind === "main") === (b.source === "MAIN")) &&
        (state === "all" || (state === "cancelled") === b.rolledBack) &&
        (!text || b.fileName.toLowerCase().includes(text) || b.importedBy.toLowerCase().includes(text)),
    );
  }, [batches, q, kind, state]);

  const cancel = useCallback(
    async (b: BatchSummary) => {
      try {
        const p = await dashboardService.rollbackPreview(b.id);
        const ok = await confirm({
          title: `Annuler l'import « ${b.fileName} » ?`,
          tone: "danger",
          confirmLabel: "Annuler l'import",
          cancelLabel: "Garder le fichier",
          description: (
            <span>
              {p.deleted} dossier(s) créé(s) par ce fichier seront supprimés
              {p.worked > 0 && <strong> (dont {p.worked} déjà travaillé(s))</strong>}, {p.restored} dossier(s) existant(s) retrouvent leurs
              valeurs d&apos;avant
              {p.kept > 0 && `, ${p.kept} restent tels quels (un fichier plus récent les a mis à jour)`}. Le fichier reste visible dans
              l&apos;historique, marqué « annulé ».
            </span>
          ),
        });
        if (!ok) return;
        const res = await dashboardService.rollback(b.id);
        toast.success("Import annulé", `${res.deleted} supprimé(s) · ${res.restored} restauré(s)`);
        setToken((t) => t + 1);
      } catch (e) {
        toast.error("Annulation impossible", e instanceof Error ? e.message : undefined);
      }
    },
    [confirm, toast],
  );

  return (
    <>
      <PageHeader
        eyebrow="Données"
        title="Fichiers injectés"
        description="Chaque fichier importé avec l'état de ses dossiers aujourd'hui. Ouvrez ses dossiers, redispatchez ceux qui ne sont pas traités, ou annulez un import fait par erreur."
        icon={<Files />}
      />

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du fichier ou auteur…" aria-label="Rechercher un fichier" />
        </label>
        <div className={styles.chips} role="group" aria-label="Type de fichier">
          {(
            [
              ["all", "Tous"],
              ["main", "Fichier admin"],
              ["sec", "Sécurisation"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`${styles.chip} ${kind === k ? styles.chipOn : ""}`} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label="État">
          {(
            [
              ["active", "Actifs"],
              ["cancelled", "Annulés"],
              ["all", "Tous"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={state === k} className={`${styles.chip} ${state === k ? styles.chipOn : ""}`} onClick={() => setState(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className={styles.count}>{shown.length} fichier(s)</span>
      </div>

      {batches === null ? (
        <div className={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className={styles.empty}>Aucun fichier ne correspond.</p>
      ) : (
        <div className={styles.list}>
          {shown.map((b, i) => (
            <motion.div
              key={b.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: b.rolledBack ? 0.6 : 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34, delay: Math.min(i, 12) * 0.035 }}
            >
              <FileCard batch={b} isSecAdmin={isSecAdmin} onCancel={() => cancel(b)} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

function FileCard({ batch: b, isSecAdmin, onCancel }: { batch: BatchSummary; isSecAdmin: boolean; onCancel: () => void }) {
  const main = b.source === "MAIN";
  const { table, dispatch } = fileLinks(b, isSecAdmin);
  const total = Math.max(b.dossiers, 1);
  const seg = (n: number, color: string) => <span style={{ width: `${(n / total) * 100}%`, background: color }} />;
  const range = b.firstDate ? (b.firstDate === b.lastDate ? formatDate(b.firstDate) : `${formatDate(b.firstDate)} → ${formatDate(b.lastDate)}`) : "—";

  return (
    <article className={`${styles.card} ${b.rolledBack ? styles.cancelled : ""}`}>
      <span className={`${styles.icon} ${main ? styles.iconMain : styles.iconSec}`}>{main ? <FileSpreadsheet /> : <ShieldCheck />}</span>

      <div style={{ minWidth: 0 }}>
        <p className={styles.name} title={b.fileName}>
          {b.fileName}
        </p>
        <div className={styles.meta}>
          <span className={`${styles.badge} ${main ? styles.badgeMain : styles.badgeSec}`}>{SOURCE_LABELS[b.source]}</span>
          {b.rolledBack && <span className={`${styles.badge} ${styles.badgeCancelled}`}>Annulé</span>}
          <span>{formatDateTime(b.importedAt)}</span>
          <span>par {b.importedBy}</span>
          <span>dossiers du {range}</span>
        </div>
      </div>

      <div className={styles.health}>
        <div className={styles.healthTop}>
          <span>
            <strong>{b.done}</strong> / {b.dossiers} clôturé(s)
          </span>
          {b.unassigned > 0 && !b.rolledBack && <span>{b.unassigned} sans pilote</span>}
        </div>
        <div className={styles.bar} aria-hidden>
          {seg(b.done, "#10b981")}
          {seg(b.onTime, "#3b82f6")}
          {seg(b.soon, "#f97316")}
          {seg(b.late, "#ef4444")}
        </div>
        <div className={styles.legend}>
          <span>
            <i className={styles.dot} style={{ background: "#ef4444" }} /> {b.late} retard
          </span>
          <span>
            <i className={styles.dot} style={{ background: "#f97316" }} /> {b.soon} bientôt
          </span>
          <span>
            <i className={styles.dot} style={{ background: "#3b82f6" }} /> {b.onTime} à temps
          </span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{b.createdRows}</div>
          <div className={styles.statLabel}>créés</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{b.updatedRows}</div>
          <div className={styles.statLabel}>mis à jour</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{b.skippedRows}</div>
          <div className={styles.statLabel}>ignorés</div>
        </div>
      </div>

      <div className={styles.actions}>
        {!b.rolledBack && (
          <Link href={table} className={`${styles.action} ${styles.ghost}`}>
            <TableProperties /> Dossiers
          </Link>
        )}
        {!b.rolledBack && dispatch && b.unassigned + b.onTime + b.soon + b.late > 0 && (
          <Link href={dispatch} className={`${styles.action} ${styles.violet}`} title="Redistribuer les dossiers non traités de ce fichier">
            <Shuffle /> Redispatcher
          </Link>
        )}
        {b.canRollback && (
          <button type="button" className={`${styles.action} ${styles.danger}`} onClick={onCancel}>
            <Undo2 /> Annuler
          </button>
        )}
      </div>
    </article>
  );
}
