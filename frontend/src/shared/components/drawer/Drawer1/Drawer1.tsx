"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface Drawer1Props {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Side panel sliding from the right. */
export function Drawer1({ open, onClose, title, subtitle, actions, children }: Drawer1Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75]">
          <motion.div
            className="absolute inset-0 bg-night/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-white shadow-pop"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
          >
            <header className="relative overflow-hidden bg-[linear-gradient(135deg,#0b1347_0%,#1a2a9c_55%,#2548ea_100%)] px-6 pt-6 pb-5 text-white">
              <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
              <div className="pointer-events-none absolute -top-20 -right-16 size-64 bg-[radial-gradient(circle,rgb(56_189_248/0.35),transparent_65%)]" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-sky-300 to-transparent" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight">{title}</h3>
                  {subtitle && <div className="mt-1 text-sm text-brand-100">{subtitle}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {actions}
                  <button
                    onClick={onClose}
                    className="grid size-8 place-items-center rounded-lg text-brand-100 transition hover:bg-white/15 hover:text-white"
                    aria-label="Fermer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </header>
            <div className="scroll-thin flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
