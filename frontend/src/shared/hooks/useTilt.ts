"use client";

import { useEffect, useRef } from "react";

/**
 * 3D tilt following the cursor. Writes CSS variables (--rx, --ry, --gx, --gy) at most once per frame,
 * no React re-render. Disabled on touch screens and with "reduce motion".
 * Use with the `.tilt` class (and optionally a `.tilt-glare` child).
 */
export function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(hover: none)").matches) return;

    let frame = 0;
    let px = 0.5;
    let py = 0.5;
    let rect: DOMRect | null = null;

    const paint = () => {
      frame = 0;
      el.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const enter = () => {
      rect = el.getBoundingClientRect();
      el.dataset.tilting = "true";
    };
    const move = (e: PointerEvent) => {
      if (!rect) rect = el.getBoundingClientRect();
      px = (e.clientX - rect.left) / rect.width;
      py = (e.clientY - rect.top) / rect.height;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => {
      rect = null;
      px = 0.5;
      py = 0.5;
      el.dataset.tilting = "false";
      if (!frame) frame = requestAnimationFrame(paint);
    };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [max]);

  return ref;
}
