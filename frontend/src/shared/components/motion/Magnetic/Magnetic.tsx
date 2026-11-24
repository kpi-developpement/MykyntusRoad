"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import styles from "./Magnetic.module.css";

interface MagneticProps {
  children: React.ReactNode;
  /** Share of the cursor offset the element follows (0.25 = a quarter). */
  strength?: number;
  className?: string;
}

const SPRING = { stiffness: 260, damping: 18, mass: 0.6 };

/**
 * Primary call to action pulled toward the cursor, springing back when it leaves.
 * Only `transform` is animated (GPU); disabled with "reduce motion" and on touch.
 */
export function Magnetic({ children, strength = 0.28, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  function move(e: React.PointerEvent<HTMLSpanElement>) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span ref={ref} className={`${styles.root} ${className ?? ""}`} style={{ x, y }} onPointerMove={move} onPointerLeave={reset}>
      {children}
    </motion.span>
  );
}
