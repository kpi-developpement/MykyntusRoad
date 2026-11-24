"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, BellRing, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { dashboardService } from "../../../services/dashboardService";
import { teamOf, type PilotWork } from "../../../types";
import styles from "./WorkAlert.module.css";

/** How often a pilot's new work is checked (only while the tab is visible). */
const POLL_MS = 30_000;
/** At the first visit, dossiers dispatched during the last 24 h count as new. */
const FIRST_WINDOW_MS = 24 * 3600 * 1000;

/** Local "yyyy-MM-ddTHH:mm:ss" (the server works in local time). */
function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Pilots (sécurisation, planification, J): as soon as dossiers are dispatched to them, a card pops up
 * ("Nouvelle mission : 12 dossiers") with a shortcut to them, the tab title shows the count and, when the
 * tab is in the background and notifications are allowed, a system notification is sent.
 */
export function WorkAlert() {
  const { user } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();
  const team = teamOf(user?.role);
  const storageKey = user ? `mykyntus.work.seen.${user.username}` : "";
  const [work, setWork] = useState<PilotWork | null>(null);
  const [hidden, setHidden] = useState(false);
  const lastFresh = useRef(0);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const since = useCallback(() => {
    const saved = storageKey ? localStorage.getItem(storageKey) : null;
    if (saved) return saved;
    const first = localIso(new Date(Date.now() - FIRST_WINDOW_MS));
    if (storageKey) localStorage.setItem(storageKey, first);
    return first;
  }, [storageKey]);

  const check = useCallback(async () => {
    if (!team || document.hidden && permission !== "granted") return;
    try {
      const w = await dashboardService.work(since());
      setWork(w);
      if (w.fresh > lastFresh.current) {
        setHidden(false);
        if (document.hidden && permission === "granted") {
          new Notification("MyKyntus · nouvelle mission", { body: `${w.fresh} dossier(s) vous ont été attribués.`, tag: "mykyntus-work" });
        }
      }
      lastFresh.current = w.fresh;
    } catch {
      // network hiccup: next poll
    }
  }, [team, since, permission]);

  useEffect(() => {
    if (!team) return;
    const first = setTimeout(check, 1200);
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => !document.hidden && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [team, check]);

  const fresh = work?.fresh ?? 0;

  // count in the tab title while something is new
  useEffect(() => {
    if (!team) return;
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = fresh > 0 ? `(${fresh}) ${base}` : base;
  }, [fresh, team]);

  const acknowledge = useCallback(() => {
    if (storageKey) localStorage.setItem(storageKey, localIso(new Date()));
    lastFresh.current = 0;
    setWork((w) => (w ? { ...w, fresh: 0 } : w));
  }, [storageKey]);

  if (!team) return null;
  const open = fresh > 0 && !hidden;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="status"
          aria-live="polite"
          className={styles.card}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <div className={styles.top}>
            <span className={styles.beacon}>
              <BellRing />
            </span>
            <div>
              <p className={styles.eyebrow}>Nouvelle mission</p>
              <p className={styles.title}>{fresh} dossier(s) viennent de vous être attribués</p>
              <p className={styles.text}>{work?.open ?? 0} dossier(s) à traiter au total.</p>
            </div>
            <button type="button" className={styles.close} aria-label="Masquer" onClick={() => setHidden(true)}>
              <X />
            </button>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={() => {
                acknowledge();
                router.push("/pilote");
              }}
            >
              Voir mes dossiers <ArrowRight />
            </button>
            <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={acknowledge}>
              Vu
            </button>
            {permission === "default" && (
              <button
                type="button"
                className={`${styles.btn} ${styles.ghost}`}
                onClick={() => Notification.requestPermission().then(setPermission)}
              >
                Activer les notifications
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
