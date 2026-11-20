"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Milliseconds to decode the whole text. */
  duration?: number;
  delay?: number;
}

/**
 * "Decoding" effect: random glyphs resolve into the text, left to right.
 * Runs once on mount with requestAnimationFrame and writes textContent directly
 * (no React re-render). Use with a monospace font to avoid width jumps.
 */
export function ScrambleText({ text, className, duration = 650, delay = 0 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = text;
      return;
    }
    let frame = 0;
    let raf = 0;
    const start = performance.now() + delay;

    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      const revealed = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        out += i < revealed || text[i] === " " ? text[i] : GLYPHS[(i * 7 + frame * 3) % GLYPHS.length];
      }
      el.textContent = out;
      frame++;
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, duration, delay]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {text}
    </span>
  );
}
