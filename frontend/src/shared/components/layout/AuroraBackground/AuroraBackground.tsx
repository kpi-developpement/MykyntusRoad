"use client";

import { useEffect, useRef } from "react";
import styles from "./AuroraBackground.module.css";

/** Max shift (px) of the clouds opposite to the cursor: depth, not motion sickness. */
const SHIFT = 22;

interface Sky {
  top: string;
  bottom: string;
  sun: string;
  sunX: string;
}

/** Light of the sky for an hour of the day. */
function skyAt(hour: number): Sky {
  if (hour >= 6 && hour < 11) return { top: "#d9e9ff", bottom: "#eef2f8", sun: "rgb(255 214 170 / 0.55)", sunX: "18%" };
  if (hour >= 11 && hour < 15) return { top: "#e6f1ff", bottom: "#f3f6fb", sun: "rgb(255 244 200 / 0.7)", sunX: "50%" };
  if (hour >= 15 && hour < 20) return { top: "#ffe6d6", bottom: "#f2eff8", sun: "rgb(255 170 120 / 0.45)", sunX: "82%" };
  return { top: "#e3e5f6", bottom: "#eef0f8", sun: "rgb(160 170 255 / 0.3)", sunX: "70%" };
}

/**
 * "Sky clock" behind the pages: a pale sky lit according to the time of day, three soft clouds
 * drifting slowly and leaning a little away from the cursor. Idle = no JS work; hidden tab = paused.
 */
export function AuroraBackground() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  // sky colour: now, then every 10 minutes
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const paint = () => {
      const s = skyAt(new Date().getHours());
      el.style.setProperty("--sky-top", s.top);
      el.style.setProperty("--sky-bottom", s.bottom);
      el.style.setProperty("--sun", s.sun);
      el.style.setProperty("--sun-x", s.sunX);
    };
    paint();
    const timer = setInterval(paint, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

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
        <span className={`${styles.cloud} ${styles.a}`} />
        <span className={`${styles.cloud} ${styles.b}`} />
        <span className={`${styles.cloud} ${styles.c}`} />
      </div>
    </div>
  );
}
