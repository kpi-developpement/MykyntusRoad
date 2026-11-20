import { cn } from "../../../utils/cn";
import { RevealText } from "../../text/RevealText/RevealText";
import { ScrambleText } from "../../text/ScrambleText/ScrambleText";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Page title: decoded eyebrow, words revealed one by one, glowing icon tile. */
export function PageHeader({ eyebrow, title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <span className="relative hidden size-14 shrink-0 animate-scale-in place-items-center overflow-hidden rounded-2xl bg-linear-to-br from-brand-400 via-brand-600 to-brand-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_14px_34px_-12px_rgb(37_72_234/0.75)] sm:grid [&_svg]:size-6">
            <span aria-hidden className="absolute -top-1/2 -left-1/2 size-full rotate-12 bg-linear-to-br from-white/40 to-transparent" />
            <span aria-hidden className="absolute inset-x-2 bottom-1.5 h-px bg-linear-to-r from-transparent via-sky-300 to-transparent" />
            <span className="relative">{icon}</span>
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.24em] text-brand-600 uppercase">
              <span aria-hidden className="h-px w-6 bg-linear-to-r from-brand-600 to-sky-400" />
              <ScrambleText text={eyebrow} />
            </p>
          )}
          <h1 className="mt-1.5 font-display text-[28px] leading-[1.1] font-semibold tracking-tight text-slate-950 sm:text-[34px]">
            <RevealText text={title} delay={0.05} />
          </h1>
          {description && (
            <p className="mt-2.5 max-w-2xl animate-fade-in text-sm leading-relaxed text-slate-500 [animation-delay:0.3s]">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex animate-fade-in flex-wrap items-center gap-2 [animation-delay:0.25s]">{actions}</div>}
    </div>
  );
}
