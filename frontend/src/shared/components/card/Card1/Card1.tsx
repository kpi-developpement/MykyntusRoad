import { cn } from "../../../utils/cn";
import { Surface } from "../../surface/Surface/Surface";

interface Card1Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Panel with a header (icon, title, actions) on a holo surface. */
export function Card1({ title, subtitle, icon, actions, children, className, bodyClassName = "p-5" }: Card1Props) {
  return (
    <Surface as="section" className={cn("rounded-3xl", className)}>
      {(title || actions) && (
        <header className="relative flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-50 to-brand-100 text-brand-600 shadow-[inset_0_1px_0_#fff] ring-1 ring-brand-100 [&_svg]:size-[18px]">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate font-display text-[15px] font-semibold tracking-tight text-slate-950">{title}</h2>}
              {subtitle && <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          <span aria-hidden className="absolute inset-x-5 bottom-0 h-px bg-linear-to-r from-brand-200/70 via-slate-200/80 to-transparent" />
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </Surface>
  );
}
