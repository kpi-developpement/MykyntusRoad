"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dashboardService } from "../../../services/dashboardService";
import type { DayStat } from "../../../types";
import { toIsoDate, today } from "../../../utils/date";
import styles from "./DayCalendar.module.css";

const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

interface DayCalendarProps {
  /** Selected date (yyyy-MM-dd). */
  value?: string;
  onSelect: (date: string, stat: DayStat | undefined) => void;
  /** Month shown first (any date of it). */
  initialMonth?: string;
  size?: "sm" | "lg";
  /** Stats loaded by the parent (otherwise the calendar loads its month itself). */
  stats?: Map<string, DayStat>;
  onMonthChange?: (from: string, to: string) => void;
}

function firstOfMonth(iso: string): Date {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** Monday-first weeks covering the month. */
function weeks(month: Date): Date[] {
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/**
 * Month calendar where every day shows what happened: red = late dossiers, orange = J+1 morning,
 * blue = on time, green = everything closed; the bar gives the split, the number the dossiers.
 */
export function DayCalendar({ value, onSelect, initialMonth, size = "sm", stats, onMonthChange }: DayCalendarProps) {
  const [month, setMonth] = useState(() => firstOfMonth(initialMonth || value || today()));
  const [own, setOwn] = useState<Map<string, DayStat>>(new Map());
  const cells = useMemo(() => weeks(month), [month]);
  const from = toIsoDate(cells[0]);
  const to = toIsoDate(cells[cells.length - 1]);
  const todayIso = today();

  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(from, to);
      return;
    }
    let cancelled = false;
    dashboardService.days(from, to).then(
      (list) => !cancelled && setOwn(new Map(list.map((d) => [d.date, d]))),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [from, to, onMonthChange]);

  const data = stats ?? own;
  const label = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className={`${styles.root} ${size === "lg" ? styles.lg : ""}`}>
      <div className={styles.head}>
        <span className={styles.month}>{label}</span>
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} onClick={() => shift(-1)} aria-label="Mois précédent">
            <ChevronLeft />
          </button>
          <button type="button" className={styles.navBtn} onClick={() => setMonth(firstOfMonth(todayIso))} aria-label="Ce mois-ci">
            ·
          </button>
          <button type="button" className={styles.navBtn} onClick={() => shift(1)} aria-label="Mois suivant">
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className={styles.grid} role="grid" aria-label={label}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const iso = toIsoDate(d);
          const s = data.get(iso);
          const total = s?.total ?? 0;
          const status = s && total > 0 ? s.status : "EMPTY";
          const classes = [
            styles.day,
            status !== "EMPTY" ? styles[status] : "",
            d.getMonth() !== month.getMonth() ? styles.outside : "",
            iso === todayIso ? styles.today : "",
            iso === value ? styles.selected : "",
          ].join(" ");
          const pct = (n: number) => `${(n / Math.max(total, 1)) * 100}%`;
          return (
            <button
              key={iso}
              type="button"
              className={classes}
              onClick={() => onSelect(iso, s)}
              aria-pressed={iso === value}
              title={
                s && total > 0
                  ? `${d.toLocaleDateString("fr-FR")} · ${total} dossier(s) : ${s.done} clôturé(s), ${s.late} en retard, ${s.soon} bientôt en retard, ${s.onTime} dans les délais`
                  : `${d.toLocaleDateString("fr-FR")} · aucun dossier`
              }
            >
              <span className={styles.num}>{d.getDate()}</span>
              {total > 0 && <span className={styles.count}>{total}</span>}
              {size === "lg" && s && total > 0 && (
                <span className={styles.detail}>
                  {s.late > 0 && `${s.late} retard`}
                  {s.late === 0 && s.soon > 0 && `${s.soon} bientôt`}
                  {s.late === 0 && s.soon === 0 && `${s.done}/${total} clôt.`}
                </span>
              )}
              {total > 0 ? (
                <span className={styles.bar}>
                  <span className={styles.segDone} style={{ width: pct(s!.done) }} />
                  <span className={styles.segOnTime} style={{ width: pct(s!.onTime) }} />
                  <span className={styles.segSoon} style={{ width: pct(s!.soon) }} />
                  <span className={styles.segLate} style={{ width: pct(s!.late) }} />
                </span>
              ) : (
                <span />
              )}
            </button>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--late)" }} /> En retard
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--soon)" }} /> Bientôt en retard
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--ontime)" }} /> Dans les délais
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--done)" }} /> Tout clôturé
        </span>
      </div>
    </div>
  );
}
