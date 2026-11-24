"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../../utils/cn";

interface Modal1Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal1({ open, onClose, title, description, icon, children, footer, size = "md" }: Modal1Props) {
  useEffect(() => {
    if (!open) return;
    // capture phase: Escape closes the modal only, not the drawer it was opened from
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
          <motion.div className="absolute inset-0 bg-night/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn("surface-pop relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-[28px]", SIZES[size])}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-transparent via-sky-400 to-transparent" />
            {(title || icon) && (
              <header className="flex items-start gap-4 px-6 pt-6 pb-2">
                {icon}
                <div className="min-w-0 flex-1">
                  {title && <h3 className="font-display text-lg font-semibold tracking-tight text-slate-950">{title}</h3>}
                  {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
                </div>
                <button
                  onClick={onClose}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fermer"
                >
                  <X className="size-4" />
                </button>
              </header>
            )}
            {children && <div className="scroll-thin overflow-y-auto px-6 py-4">{children}</div>}
            {footer && <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
