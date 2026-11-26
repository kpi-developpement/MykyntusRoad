"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Clock3, FolderOpen, Gauge, Hourglass, ShieldAlert, Shuffle, TableProperties, TriangleAlert, UserX, type LucideIcon } from "lucide-react";
import { DayCalendar } from "../../components/calendar/DayCalendar/DayCalendar";
import { DossierDrawer } from "../../components/drawer/DossierDrawer/DossierDrawer";
import { PageHeader } from "../../components/layout/PageHeader/PageHeader";
import { useToast } from "../../components/toast/ToastProvider/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/dashboardService";
import { dossierService } from "../../services/dossierService";
import { DELAY_LABELS, type BatchSummary, type DayStat, type Delay, type DossierRow, type DossierTable } from "../../types";
import { formatDateLong, formatDateTime, toIsoDate, today } from "../../utils/date";
import { fileLinks } from "../FilesView/FilesView";
import { DayRibbon, dateRange } from "./DayRibbon";
import styles from "./DashboardView.module.css";

/** Counters: three months back, two weeks ahead. Ribbon: three weeks back, one week ahead. */
const BACK = 90;
const AHEAD = 14;
const RIBBON_BACK = 21;
const RIBBON_AHEAD = 7;

const DELAY_COLOR: Record<Delay, string> = { LATE: "#f0435a", SOON: "#ff8a3d", ON_TIME: "#2f6bff", DONE: "#12b5a6", CANCELLED: "#94a3b8" };
const DELAY_ORDER: Delay[] = ["LATE", "SOON", "ON_TIME", "DONE", "CANCELLED"];

const shiftIso = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
};

/**
 * Global view of the admins: the ribbon of the days (what each date became, past dates included),
 * the counters to act on, a calendar, and for the chosen day the list of its dossiers (click one to
 * open its life cycle).
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

  const loadMonth = useCallback((from: string, to: string) => {
    dashboardService.days(from, to).then(
      (list) => setMonth(new Map(list.map((d) => [d.date, d]))),
      () => undefined,
    );
  }, []);

  const byDate = useMemo(() => new Map((range ?? []).map((d) => [d.date, d])), [range]);
  const ribbon = useMemo(() => dateRange(shiftIso(todayIso, -RIBBON_BACK), shiftIso(todayIso, RIBBON_AHEAD)), [todayIso]);

  const totals = useMemo(() => {
    const t = { late: 0, soon: 0, onTime: 0, done: 0, unassignedSecu: 0, unassignedJ: 0, planif: 0, unsecured: 0, lateDays: [] as DayStat[] };
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
      // sécurisation the day before the appointment (and the day itself)
      if (d.date === todayIso || d.date === shiftIso(todayIso, 1)) t.unsecured += d.unsecured ?? 0;
      if (d.late > 0) t.lateDays.push(d);
    }
    t.lateDays.sort((a, b) => (a.date < b.date ? 1 : -1));
    return t;
  }, [range, todayIso]);

  const base = isSecAdmin ? "/securisation/espace" : "/admin/suivi";
  const dispatchHref = (date: string) => (isSecAdmin ? `/securisation/dispatch?date=${date}` : `/admin/suivi?date=${date}&team=J&pilot=`);

  const tiles: { label: string; value: number; hint: string; icon: LucideIcon; accent: string; href: string }[] = [
    { label: "En retard", value: totals.late, hint: "Passé J+1 12h00", icon: TriangleAlert, accent: "#f0435a", href: `${base}?date=&delay=LATE` },
    { label: "Bientôt en retard", value: totals.soon, hint: "J+1 avant midi", icon: Hourglass, accent: "#ff8a3d", href: `${base}?date=&delay=SOON` },
    { label: "Dans les délais", value: totals.onTime, hint: "Aujourd'hui et à venir", icon: Clock3, accent: "#2f6bff", href: `${base}?date=&delay=ON_TIME` },
    { label: "Clôturés", value: totals.done, hint: `Sur ${BACK} jours`, icon: CheckCircle2, accent: "#12b5a6", href: `${base}?date=&delay=DONE` },
    isSecAdmin
      ? { label: "Sans pilote", value: totals.unassignedSecu, hint: "À dispatcher", icon: UserX, accent: "#8b7cf6", href: "/securisation/dispatch" }
      : { label: "Sans pilote", value: totals.unassignedJ, hint: "Personne ne l'a pris", icon: UserX, accent: "#8b7cf6", href: "/admin/suivi?date=&team=J&pilot=" },
    isSecAdmin
      ? {
          label: "À sécuriser",
          value: totals.unsecured,
          hint: "RDV demain ou aujourd'hui",
          icon: ShieldAlert,
          accent: "#e11d48",
          href: "/securisation/espace?date=&secu=J_MINUS_1,J",
        }
      : {
          label: "Cellule plani ouverte",
          value: totals.planif,
          hint: "Colonnes J-1 à remplir",
          icon: FolderOpen,
          accent: "#8b7cf6",
          href: "/admin/suivi?date=&route=PLANIFICATION",
        },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Vision globale"
        title="Tableau de bord"
        description="Ce que chaque date est devenue, même passée : ouvrez un jour pour voir ses dossiers et leur cycle de vie."
        icon={<Gauge />}
      />

      <DayRibbon dates={ribbon} stats={byDate} today={todayIso} selected={selected} onSelect={setSelected} />

      <div className={styles.tiles}>
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 34, delay: 0.15 + i * 0.045 }}
          >
            <Link href={t.href} className={styles.tile} style={{ "--accent": t.accent } as React.CSSProperties}>
              <span className={styles.tileHead}>
                {t.label}
                <span className={styles.tileIcon}>
                  <t.icon aria-hidden />
                </span>
              </span>
              <div className={styles.tileValue}>{range ? t.value : "–"}</div>
              <div className={styles.tileHint}>{t.hint}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className={styles.bento}>
        <section className={styles.glass} aria-label="Calendrier">
          <DayCalendar size="lg" value={selected} onSelect={(d) => setSelected(d)} stats={month} onMonthChange={loadMonth} />
        </section>

        <div className={styles.side}>
          <DayPanel
            key={selected}
            date={selected}
            stat={month.get(selected) ?? byDate.get(selected)}
            openHref={`${base}?date=${selected}`}
            dispatchHref={dispatchHref(selected)}
            dispatchLabel={isSecAdmin ? "Redispatcher les non traités" : "Voir les dossiers sans pilote"}
          />

          <section className={styles.glass} aria-label="Retards ouverts">
            <h2 className={styles.h2}>
              Retards encore ouverts
              <small>{totals.lateDays.length} jour(s)</small>
            </h2>
            {totals.lateDays.length === 0 ? (
              <p className={styles.empty}>Aucun dossier en retard. Rien à rattraper.</p>
            ) : (
              <div className={`${styles.lateList} scroll-thin`}>
                {totals.lateDays.map((d) => (
                  <button key={d.date} type="button" className={styles.lateRow} onClick={() => setSelected(d.date)} style={{ border: 0, font: "inherit", cursor: "pointer", textAlign: "left" }}>
                    <TriangleAlert size={15} aria-hidden />
                    <span className={styles.lateDate}>{formatDateLong(d.date)}</span>
                    <span className={styles.lateCount}>
                      {d.late} sur {d.total}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.glass} aria-label="Derniers fichiers">
            <h2 className={styles.h2}>
              Derniers fichiers
              <Link href={isSecAdmin ? "/securisation/fichiers" : "/admin/fichiers"} className={styles.link}>
                Voir tous les fichiers
              </Link>
            </h2>
            {batches && batches.length === 0 && <p className={styles.empty}>Aucun fichier importé pour l&apos;instant.</p>}
            <div className={styles.fileList}>
              {(batches ?? [])
                .filter((b) => !b.rolledBack)
                .slice(0, 5)
                .map((b) => {
                  const total = Math.max(b.dossiers, 1);
                  const w = (n: number) => `${(n / total) * 100}%`;
                  return (
                    <Link key={b.id} href={fileLinks(b, isSecAdmin).table} className={styles.fileRow}>
                      <span className={styles.fileName} title={b.fileName}>
                        {b.fileName}
                      </span>
                      <span className={styles.fileMeta}>{formatDateTime(b.importedAt)}</span>
                      <span className={styles.fileBar} aria-hidden>
                        <span style={{ width: w(b.done), background: "#12b5a6" }} />
                        <span style={{ width: w(b.onTime), background: "#2f6bff" }} />
                        <span style={{ width: w(b.soon), background: "#ff8a3d" }} />
                        <span style={{ width: w(b.late), background: "#f0435a" }} />
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

type Tab = Delay | "ALL";

/** The chosen day: its counts, its dossiers (late first), filter by delay, click one = its life cycle. */
function DayPanel({
  date,
  stat,
  openHref,
  dispatchHref,
  dispatchLabel,
}: {
  date: string;
  stat?: DayStat;
  openHref: string;
  dispatchHref: string;
  dispatchLabel: string;
}) {
  const reduce = useReducedMotion();
  const [table, setTable] = useState<DossierTable | null>(null);
  const [tab, setTab] = useState<Tab>("ALL");
  const [open, setOpen] = useState<DossierRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    dossierService.search({ date, search: "", filters: [], sort: null, page: 0, size: 200 }).then(
      (t) => !cancelled && setTable(t),
      () => !cancelled && setTable(null),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  const rows = useMemo(() => {
    const list = [...(table?.rows.content ?? [])];
    list.sort((a, b) => DELAY_ORDER.indexOf(a.delay) - DELAY_ORDER.indexOf(b.delay) || a.idExterne.localeCompare(b.idExterne));
    return tab === "ALL" ? list : list.filter((r) => r.delay === tab);
  }, [table, tab]);

  const count = (d: Delay) => table?.rows.content.filter((r) => r.delay === d).length ?? 0;
  const total = table?.rows.totalElements ?? stat?.total ?? 0;
  const tabs: { id: Tab; label: string; n: number; color?: string }[] = [
    { id: "ALL", label: "Tous", n: total },
    ...DELAY_ORDER.map((d) => ({ id: d as Tab, label: DELAY_LABELS[d], n: count(d), color: DELAY_COLOR[d] })).filter((t) => t.n > 0),
  ];

  return (
    <section className={styles.glass} aria-label="Jour sélectionné">
      <p className={styles.dayTitle}>{formatDateLong(date)}</p>
      <p className={styles.daySummary}>
        {total === 0
          ? "Aucun dossier ce jour-là."
          : `${total} dossier(s), ${stat?.done ?? count("DONE")} clôturé(s), ${stat?.late ?? count("LATE")} en retard.`}
      </p>

      {total > 0 && (
        <>
          <div className={styles.tabs} role="tablist" aria-label="Filtrer les dossiers du jour">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`${styles.tab} ${tab === t.id ? styles.tabOn : ""}`} onClick={() => setTab(t.id)}>
                {tab === t.id && <motion.span layoutId={`day-tab-${date}`} className={styles.tabPill} transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                {t.color && <i style={{ background: t.color }} />}
                {t.label} <b>{t.n}</b>
              </button>
            ))}
          </div>

          <div className={`${styles.rows} scroll-thin`}>
            {rows.map((r, i) => (
              <motion.button
                key={r.id}
                type="button"
                className={styles.row}
                onClick={() => setOpen(r)}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 36, delay: Math.min(i, 14) * 0.025 }}
                title="Ouvrir le cycle de vie"
              >
                <span className={styles.rowDot} style={{ background: DELAY_COLOR[r.delay] }} />
                <span style={{ minWidth: 0 }}>
                  <span className={styles.rowId}>{r.idExterne}</span>
                  <span className={styles.rowMeta} style={{ display: "block" }}>
                    {[r.planification ? "Cellule plani ouverte" : null, r.horsSecu ? "Hors sécurisation" : null, r.assignedJ ? `Pilote ${r.assignedJ}` : null, r.assignedTo ? `Sécurisation ${r.assignedTo}` : null]
                      .filter(Boolean)
                      .join(", ") || "Non attribué"}
                  </span>
                </span>
                <span className={styles.rowDelay} style={{ color: DELAY_COLOR[r.delay], background: `${DELAY_COLOR[r.delay]}1a` }}>
                  {DELAY_LABELS[r.delay]}
                </span>
              </motion.button>
            ))}
            {table && table.rows.totalElements > table.rows.content.length && (
              <p className={styles.empty}>Les 200 premiers dossiers sont affichés : ouvrez le jour pour tout voir.</p>
            )}
          </div>

          <div className={styles.buttons}>
            <Link href={openHref} className={`${styles.button} ${styles.primary}`}>
              <TableProperties aria-hidden /> Ouvrir ce jour dans le suivi
            </Link>
            {(stat?.done ?? 0) < total && (
              <Link href={dispatchHref} className={`${styles.button} ${styles.soft}`}>
                <Shuffle aria-hidden /> {dispatchLabel}
              </Link>
            )}
          </div>
        </>
      )}

      <DossierDrawer row={open} columns={table?.sourceColumns ?? []} fields={table?.fields ?? []} onClose={() => setOpen(null)} />
    </section>
  );
}
