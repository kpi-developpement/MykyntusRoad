"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../utils/cn";

interface PopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "start" | "end";
  offset?: number;
  width?: number | string;
  className?: string;
}

const MARGIN = 8;

/**
 * Floating panel rendered in a portal (never clipped by scrolling tables),
 * positioned under its anchor and flipped above when there is no room.
 */
export function Popover({ anchor, open, onClose, children, align = "start", offset = 8, width, className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const el = ref.current;
    if (!el) return;

    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = align === "end" ? r.right - w : r.left;
      left = Math.min(Math.max(MARGIN, left), vw - w - MARGIN);

      let top = r.bottom + offset;
      const above = r.top - offset - h;
      if (top + h > vh - MARGIN && above > MARGIN) top = above;
      top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transformOrigin = `${align === "end" ? "right" : "left"} ${top < r.top ? "bottom" : "top"}`;
    };

    // at most one measurement per frame, whatever the number of scroll / resize events
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };

    place();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [open, anchor, align, offset]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchor, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && anchor && (
        <motion.div
          ref={ref}
          role="dialog"
          className={cn("surface-pop fixed z-[70] overflow-hidden rounded-2xl", className)}
          style={{ top: -9999, left: -9999, width }}
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 520, damping: 36 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
