"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion/react";
import { cn } from "../../../utils/cn";

const formatInt = (n: number) => Math.round(n).toLocaleString("fr-FR");

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (n: number) => string;
}

/** Counts from the previous value to the new one. */
export function AnimatedNumber({ value, className, format = formatInt }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controls = animate(previous.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, format]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(0)}
    </span>
  );
}
