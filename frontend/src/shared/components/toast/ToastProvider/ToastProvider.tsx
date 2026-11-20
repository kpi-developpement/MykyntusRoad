"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "../../../utils/cn";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const DURATION_MS = 4200;

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<ToastTone, { icon: typeof Info; iconClass: string; bar: string }> = {
  success: { icon: CircleCheck, iconClass: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  error: { icon: CircleAlert, iconClass: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
  info: { icon: Info, iconClass: "bg-brand-50 text-brand-600", bar: "bg-brand-500" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone = TONES[t.tone];
            const Icon = tone.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 48, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 48, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="surface-pop pointer-events-auto relative overflow-hidden rounded-2xl"
                role="status"
              >
                <div className="flex items-start gap-3 p-3.5 pr-10">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone.iconClass)}>
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="absolute top-3 right-3 grid size-6 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fermer"
                >
                  <X className="size-3.5" />
                </button>
                <motion.div
                  className={cn("absolute bottom-0 left-0 h-0.5 w-full origin-left", tone.bar)}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
