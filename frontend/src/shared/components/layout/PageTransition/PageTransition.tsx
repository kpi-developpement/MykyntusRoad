"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

/**
 * Page change: the new page unfolds from the top (clip-path morph) while it settles into place
 * on a critically damped spring. Transform, opacity and clip-path only; once done, nothing stays
 * on the wrapper (no clip, no transform) so sticky headers and fixed overlays behave normally.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  if (reduce) return <div key={pathname}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      key={pathname}
      initial={{ opacity: 0, y: 12, scale: 0.992, clipPath: "inset(0% 0% 18% 0% round 28px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0% round 0px)" }}
      transition={{
        opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
        clipPath: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
        default: { type: "spring", stiffness: 380, damping: 40 },
      }}
      onAnimationComplete={() => {
        if (!ref.current) return;
        ref.current.style.clipPath = "none";
        ref.current.style.transform = "none";
      }}
      style={{ transformOrigin: "50% 0%" }}
    >
      {children}
    </motion.div>
  );
}
