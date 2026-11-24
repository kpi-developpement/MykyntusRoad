import { cn } from "../../../utils/cn";
import { KineticTitle } from "../../text/KineticTitle/KineticTitle";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Page title: neumorphic icon key, kinetic headline, the section it belongs to and a short description. */
export function PageHeader({ eyebrow, title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-4">
        {icon && (
          <span className="relative hidden size-14 shrink-0 animate-scale-in place-items-center rounded-[20px] bg-[#EEF2F8] text-[#2F6BFF] shadow-[-6px_-6px_14px_#fff,7px_8px_18px_rgb(100_116_160/0.3)] sm:grid [&_svg]:size-6">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="flex items-center gap-2 text-[13px] font-medium text-slate-500">{eyebrow}</p>}
          <h1 className="mt-0.5 font-display text-[30px] leading-[1.08] font-bold tracking-[-0.025em] text-[#14213D] sm:text-[36px]">
            <KineticTitle text={title} delay={0.05} />
          </h1>
          {description && <p className="mt-2 max-w-2xl animate-fade-in text-sm leading-relaxed text-slate-500 [animation-delay:0.3s]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex animate-fade-in flex-wrap items-center gap-2 [animation-delay:0.25s]">{actions}</div>}
    </div>
  );
}
