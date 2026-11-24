"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckCircle2,
  Clock3,
  Files,
  Hourglass,
  LayoutDashboard,
  Shuffle,
  TableProperties,
  TriangleAlert,
  UserX,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { DayCalendar } from "../../components/calendar/DayCalendar/DayCalendar";
import { PageHeader } from "../../components/layout/PageHeader/PageHeader";
import { useToast } from "../../components/toast/ToastProvider/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/dashboardService";
import type { BatchSummary, DayStat } from "../../types";
import { formatDateLong, formatDateTime, toIsoDate, today } from "../../utils/date";
import { fileLinks } from "../FilesView/FilesView";
import styles from "./DashboardView.module.css";

/** Range of the counters: three months back, two weeks ahead. */
const BACK = 90;
const AHEAD = 14;

const shiftIso = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
};

/** Writes the cursor position as CSS variables (card spotlight, no React render). */
function track(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/**
 * Global view of the admins (admin and sécurisation admin): what is late or about to be, the state of
 * every date in a coloured calendar (past dates included), the open delays day by day and the last files.
 */
export function DashboardView() {
  const { user } = useAuth();
  const isSecAdmin = user?.role === "ADMIN_SECURISATION";
  const toast = useToast();
  const reduce = useReducedMotion();
  const todayIso = today();
  const [range, setRange] = useState<DayStat[] | null>(null);
  const [month, setMonth] = useState<Map<string, DayStat>>(new Map());
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [selected, setSelected] = useState(todayIso);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dashboardService.days(shiftIso(todayIso, -BACK), shiftIso(todayIso, AHEAD)), dashboardService.batches(8)]).then(
      ([days, files]) => {
        if (cancelled) return;
        setRange(days);
        setBatches(files);
      },
      (e: Error) => !cancelled && toast.error("Chargement impossible", e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [todayIso, toast]);

  // the calendar asks for its visible weeks
  const loadMonth = useCallback((from: string, to: string) => {
    dashboardService.days(from, to).then(
      (list) => setMonth(new Map(list.map((d) => [d.date, d]))),
      () => undefined,
    );
  }, []);

  const totals = useMemo(() => {
    const t = { late: 0, soon: 0, onTime: 0, done: 0, unassignedSecu: 0, unassignedJ: 0, planif: 0, lateDays: [] as DayStat[] };
    for (const d of range ?? []) {
      t.late += d.late;
      t.soon += d.soon;
      t.onTime += d.onTime;
      t.done += d.done;
      if (d.date >= shiftIso(todayIso, -1)) {
        t.unassignedSecu += d.unassignedSecu;
        t.unassignedJ += d.unassignedJ;
        t.planif += d.planification;
      }
      if (d.late > 0) t.lateDays.push(d);
    }
    t.lateDays.sort((a, b) => (a.date < b.date ? 1 : -1));
    return t;
  }, [range, todayIso]);

  const day = month.get(selected) ?? range?.find((d) => d.date === selected);
  const base = isSecAdmin ? "/securisation/espace" : "/admin/suivi";
  const dispatchBase = isSecAdmin ? "/securisation/dispatch" : "/admin/dispatch?team=J&";
  const dispatchHref = (date: string) => (isSecAdmin ? `${dispatchBase}?date=${date}` : `${dispatchBase}date=${date}`);

  const kpis: { label: string; value: number; hint: string; icon: LucideIcon; accent: string; href: string }[] = [
    { label: "En retard", value: totals.late, hint: "Après J+1 12h00, non clôturés", icon: TriangleAlert, accent: "#ef4444", href: `${base}?date=&delay=LATE` },
    { label: "Bientôt", value: totals.soon, hint: "J+1 avant 12h00", icon: Hourglass, accent: "#f97316", href: `${base}?date=&delay=SOON` },
    { label: "Dans les délais", value: totals.onTime, hint: "Aujourd'hui et à venir", icon: Clock3, accent: "#3b82f6", href: `${base}?date=&delay=ON_TIME` },
    { label: "Clôturés", value: totals.done, hint: `Sur ${BACK} jours`, icon: CheckCircle2, accent: "#10b981", href: `${base}?date=&delay=DONE` },
    isSecAdmin
      ? { label: "Sans pilote", value: totals.unassignedSecu, hint: "Sécurisation, à dispatcher", icon: UserX, accent: "#a78bfa", href: "/securisation/dispatch" }
      : { label: "Sans agent J", value: totals.unassignedJ, hint: "À dispatcher", icon: UserX, accent: "#a78bfa", href: "/admin/dispatch?team=J" },
    {
      label: "À planifier",
      value: totals.planif,
      hint: "Cellule plani ≠ Planifié",
      icon: Workflow,
      accent: "#c084fc",
      href: isSecAdmin ? "/securisation/espace?route=PLANIFICATION" : "/admin/planification",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Vision globale"
        title="Tableau de bord"
        description="Ce qui est en retard, ce qui va l'être, et l'état de chaque date — même passée. Cliquez sur un jour du calendrier pour voir ce qui s'y est passé."
        icon={<LayoutDashboard />}
      />

      <div className={styles.kpis}>
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30, delay: i * 0.05 }}
          >
            <Link href={k.href} className={styles.kpi} style={{ "--accent": k.accent } as React.CSSProperties} onPointerMove={track}>
              <span className={styles.kpiLabel}>
                <k.icon aria-hidden /> {k.label}
              </span>
              <div className={styles.kpiValue}>{range ? k.value : "—"}</div>
              <div className={styles.kpiHint}>{k.hint}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className={styles.bento}>
        <section className={styles.panel} aria-label="Calendrier des dossiers">
          <h2 className={styles.title}>Calendrier des dossiers</h2>
          <DayCalendar size="lg" value={selected} onSelect={(d) => setSelected(d)} stats={month} onMonthChange={loadMonth} />
        </section>

        <div className={styles.side}>
          <section className={styles.panel} aria-label="Jour sélectionné">
            <h2 className={styles.title}>Jour sélectionné</h2>
            <p className={styles.dayHead}>{formatDateLong(selected)}</p>
            {day && day.total > 0 ? (
              <>
                <div className={styles.dayGrid}>
                  <DayStatBox label="Dossiers" value={day.total} color="#0f172a" />
                  <DayStatBox label="Clôturés" value={day.done} color="#059669" />
                  <DayStatBox label="En retard" value={day.late} color="#dc2626" />
                  <DayStatBox label="Bientôt en retard" value={day.soon} color="#ea580c" />
                  <DayStatBox label="Dans les délais" value={day.onTime} color="#2563eb" />
                  <DayStatBox label="Hors sécurisation" value={day.horsSecu} color="#64748b" />
                  <DayStatBox label="En planification" value={day.planification} color="#7c3aed" />
                  <DayStatBox label={isSecAdmin ? "Sans pilote" : "Sans agent J"} value={isSecAdmin ? day.unassignedSecu : day.unassignedJ} color="#7c3aed" />
                </div>
                <div className={styles.buttons}>
                  <Link href={`${base}?date=${selected}`} className={`${styles.button} ${styles.primary}`}>
                    <TableProperties /> Ouvrir ce jour
                  </Link>
                  {day.done < day.total && (
                    <Link href={dispatchHref(selected)} className={`${styles.button} ${styles.soft}`}>
                      <Shuffle /> Redispatcher les non traités
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <p className={styles.empty}>Aucun dossier ce jour-là.</p>
            )}
          </section>

          <section className={styles.panelDark} aria-label="Retards ouverts">
            <h2 className={styles.title}>
              Retards ouverts
              <span className={styles.titleLink}>{totals.lateDays.length} jour(s)</span>
            </h2>
            {totals.lateDays.length === 0 ? (
              <p className={styles.empty}>Aucun dossier en retard.</p>
            ) : (
              <div className={`${styles.lateList} scroll-thin`}>
                {totals.lateDays.map((d) => (
                  <Link key={d.date} href={`${base}?date=${d.date}&delay=LATE`} className={styles.lateRow}>
                    <TriangleAlert size={15} aria-hidden />
                    <span className={styles.lateDate}>{formatDateLong(d.date)}</span>
                    <span className={styles.lateCount}>{d.late} / {d.total}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.panelDark} aria-label="Derniers fichiers">
            <h2 className={styles.title}>
              Derniers fichiers
              <Link href={isSecAdmin ? "/securisation/fichiers" : "/admin/fichiers"} className={styles.titleLink}>
                Tous <Files size={12} style={{ display: "inline", verticalAlign: "-2px" }} />
              </Link>
            </h2>
            {batches && batches.length === 0 && <p className={styles.empty}>Aucun fichier importé.</p>}
            <div className={styles.fileList}>
              {(batches ?? []).filter((b) => !b.rolledBack).slice(0, 5).map((b) => {
                const total = Math.max(b.dossiers, 1);
                const w = (n: number) => `${(n / total) * 100}%`;
                return (
                  <Link key={b.id} href={fileLinks(b, isSecAdmin).table} className={styles.fileRow}>
                    <span className={styles.fileName} title={b.fileName}>
                      {b.fileName}
                    </span>
                    <span className={styles.fileMeta}>{formatDateTime(b.importedAt)}</span>
                    <span className={styles.fileBar} aria-hidden>
                      <span style={{ width: w(b.done), background: "#10b981" }} />
                      <span style={{ width: w(b.onTime), background: "#3b82f6" }} />
                      <span style={{ width: w(b.soon), background: "#f97316" }} />
                      <span style={{ width: w(b.late), background: "#ef4444" }} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function DayStatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.dayStat}>
      <div className={styles.dayStatValue} style={{ color }}>
        {value}
      </div>
      <div className={styles.dayStatLabel}>{label}</div>
    </div>
  );
}
