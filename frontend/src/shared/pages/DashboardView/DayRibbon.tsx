"use client";

import type { DayStat } from "../../types";
import { formatDateLong, toIsoDate } from "../../utils/date";
import styles from "./DayRibbon.module.css";

interface DayRibbonProps {
  /** Every date of the window, in order (days without dossiers included). */
  dates: string[];
  stats: Map<string, DayStat>;
  today: string;
  selected: string;
  onSelect: (date: string) => void;
}

/**
 * The days at a glance: one capsule per date, height = dossiers of the day, filled with what is
 * closed, on time, about to be late (J+1 morning) and late. Click a day to open it.
 */
export function DayRibbon({ dates, stats, today, selected, onSelect }: DayRibbonProps) {
  const max = Math.max(1, ...dates.map((d) => stats.get(d)?.total ?? 0));
  const late = dates.reduce((sum, d) => sum + (stats.get(d)?.late ?? 0), 0);

  return (
    <section className={styles.wrap} aria-label="Les jours en un coup d'œil">
      <div className={styles.top}>
        <h2 className={styles.title}>Trois semaines passées, une semaine à venir</h2>
        <p className={styles.sub}>
          {late > 0 ? `${late} dossier(s) toujours en retard sur la période` : "Aucun retard sur la période"}. Cliquez sur un jour pour l&apos;ouvrir.
        </p>
      </div>
      <div className={styles.track} role="listbox" aria-label="Jours">
        {dates.map((iso, i) => {
          const s = stats.get(iso);
          const total = s?.total ?? 0;
          const h = total ? Math.max(10, (total / max) * 100) : 4;
          const part = (n: number) => `${(n / Math.max(total, 1)) * 100}%`;
          const [y, m, d] = iso.split("-").map(Number);
          const monday = new Date(y, m - 1, d).getDay() === 1;
          return (
            <button
              key={iso}
              type="button"
              role="option"
              aria-selected={iso === selected}
              title={s ? `${formatDateLong(iso)} : ${total} dossier(s), ${s.late} en retard, ${s.soon} bientôt, ${s.done} clôturé(s)` : `${formatDateLong(iso)} : aucun dossier`}
              className={[styles.col, !total && styles.empty, iso === today && styles.today, iso === selected && styles.selected, monday && styles.monday]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(iso)}
            >
              {total > 0 && <span className={styles.count}>{total}</span>}
              <span className={styles.capsule} style={{ height: `${h}%`, "--i": i } as React.CSSProperties}>
                {s && (
                  <>
                    <span className={styles.done} style={{ height: part(s.done) }} />
                    <span className={styles.onTime} style={{ height: part(s.onTime) }} />
                    <span className={styles.soon} style={{ height: part(s.soon) }} />
                    <span className={styles.late} style={{ height: part(s.late) }} />
                    <span className={styles.cancelled} style={{ height: part(s.cancelled ?? 0) }} />
                  </>
                )}
              </span>
              <span className={styles.day}>{iso === today ? "auj." : d}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span>
          <i style={{ background: "#f0435a" }} /> En retard
        </span>
        <span>
          <i style={{ background: "#ff8a3d" }} /> Bientôt en retard
        </span>
        <span>
          <i style={{ background: "#2f6bff" }} /> Dans les délais
        </span>
        <span>
          <i style={{ background: "#12b5a6" }} /> Clôturés
        </span>
        <span>
          <i style={{ background: "repeating-linear-gradient(135deg,#94a3b8 0 2px,#cbd5e1 2px 4px)" }} /> Import annulé
        </span>
      </div>
    </section>
  );
}

/** Every date from `from` to `to` (included). */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  const cur = new Date(y, m - 1, d);
  while (toIsoDate(cur) <= to) {
    out.push(toIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
