"use client";

import { useEffect, useRef } from "react";
import styles from "./AuroraBackground.module.css";

/** Max shift (px) of the orbs opposite to the cursor: depth, not motion sickness. */
const SHIFT = 26;

/**
 * Interactive mesh gradient behind the pages: slow drifting orbs that lean slightly away
 * from the cursor. The cursor only writes a transform on one layer, eased in requestAnimationFrame,
 * and the loop stops as soon as the layer has caught up (idle = 0 frame).
 */
export function AuroraBackground() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    const host = root.current;
    if (!el || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const tick = () => {
      frame = 0;
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = -(e.clientX / window.innerWidth - 0.5) * SHIFT;
      ty = -(e.clientY / window.innerHeight - 0.5) * SHIFT;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => host.classList.toggle(styles.paused, document.hidden);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={root} aria-hidden className={styles.root}>
      <div ref={layer} className={styles.parallax}>
        <span className={`${styles.orb} ${styles.blue}`} />
        <span className={`${styles.orb} ${styles.sky}`} />
        <span className={`${styles.orb} ${styles.violet}`} />
      </div>
    </div>
  );
}
