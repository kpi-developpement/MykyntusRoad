"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Shuffle, Workflow } from "lucide-react";
import { Magnetic } from "@/shared/components/motion/Magnetic/Magnetic";
import type { DossierGrid } from "@/shared/hooks/useDossierGrid";
import { dossierService } from "@/shared/services/dossierService";
import type { ColumnFilter, DossierCriteria } from "@/shared/types";
import styles from "./PlanifBanner.module.css";

interface Counts {
  total: number;
  unassigned: number;
  late: number;
}

const ROUTE: ColumnFilter = { key: "route", values: ["PLANIFICATION"] };

/** Writes the cursor position as CSS variables (no React render on mouse move). */
function track(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/**
 * Admin: how many dossiers the sécurisation team did not plan ("Cellule plani" not "Planifié"),
 * how many still have no planification agent, how many are late, and a shortcut to dispatch them.
 */
export function PlanifBanner({ grid }: { grid: DossierGrid }) {
  const reduce = useReducedMotion();
  const [counts, setCounts] = useState<Counts | null>(null);
  const { date, search, filters } = grid.criteria;
  const statsToken = grid.statsToken;

  useEffect(() => {
    let cancelled = false;
    const others = filters.filter((f) => f.key !== "route");
    const base: DossierCriteria = { date, search, filters: others, sort: null, page: 0, size: 1 };
    const routed: DossierCriteria = { ...base, filters: [...others, ROUTE] };
    Promise.all([
      dossierService.facets(base, "route", ""),
      dossierService.facets(routed, "assignee:PLANIFICATION", ""),
      dossierService.facets(routed, "delay", ""),
    ]).then(
      ([route, assignee, delay]) => {
        if (cancelled) return;
        setCounts({
          total: route.values.find((v) => v.value === "PLANIFICATION")?.count ?? 0,
          unassigned: assignee.emptyCount,
          late: delay.values.filter((v) => v.value === "LATE" || v.value === "SOON").reduce((sum, v) => sum + v.count, 0),
        });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [date, search, filters, statsToken]);

  if (!counts || counts.total === 0) return null;

  return (
    <motion.section
      aria-label="Dossiers à planifier"
      className={styles.card}
      onPointerMove={track}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={styles.lead}>
        <span className={styles.icon}>
          <Workflow />
        </span>
        <div className={styles.leadText}>
          <p className={styles.eyebrow}>Planification</p>
          <p className={styles.title}>Dossiers non planifiés par la sécurisation</p>
        </div>
      </div>

      <Stat label="À planifier" dot="#7c3aed" value={counts.total} />
      <Stat label="Sans agent" dot="#94a3b8" value={counts.unassigned} />
      <Stat label="En retard / bientôt" dot="#ef4444" value={counts.late} late={counts.late > 0} />

      <div className={styles.actions}>
        <Link href="/admin/planification" className={`${styles.link} ${styles.ghost}`}>
          Voir <ArrowRight />
        </Link>
        <Magnetic>
          <Link href="/admin/dispatch?team=PLANIFICATION" className={`${styles.link} ${styles.primary}`}>
            <Shuffle /> Dispatcher{counts.unassigned > 0 ? ` ${counts.unassigned}` : ""}
          </Link>
        </Magnetic>
      </div>
    </motion.section>
  );
}

function Stat({ label, dot, value, late }: { label: string; dot: string; value: number; late?: boolean }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>
        <span className={styles.dot} style={{ background: dot }} />
        {label}
      </p>
      <p className={`${styles.value} ${late ? styles.late : ""}`}>{value}</p>
    </div>
  );
}
