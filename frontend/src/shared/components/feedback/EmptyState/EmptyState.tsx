import { cn } from "../../../utils/cn";

interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/** Friendly empty screen with a floating holographic illustration. */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex animate-fade-in flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-6">
        <div className="absolute -inset-10 -z-10 bg-[radial-gradient(circle,rgb(147_180_253/0.45),transparent_65%)]" />
        <svg width="140" height="104" viewBox="0 0 140 104" fill="none" aria-hidden className="animate-float">
          <ellipse cx="70" cy="98" rx="38" ry="4" fill="#dbe6fe" />
          <rect x="24" y="16" width="80" height="66" rx="13" fill="#eef4ff" stroke="#bfd3fe" strokeWidth="1.5" />
          <rect x="36" y="8" width="80" height="66" rx="13" fill="#fff" stroke="url(#es-edge)" strokeWidth="1.5" />
          <rect x="48" y="24" width="40" height="6" rx="3" fill="#dbe6fe" />
          <rect x="48" y="36" width="56" height="6" rx="3" fill="#eef4ff" />
          <rect x="48" y="48" width="30" height="6" rx="3" fill="#eef4ff" />
          <circle cx="102" cy="68" r="15" fill="#fff" stroke="#2548ea" strokeWidth="3" />
          <path d="M113 79l10 10" stroke="#2548ea" strokeWidth="4" strokeLinecap="round" />
          <path d="M96 63l12 10M108 63l-12 10" stroke="#93b4fd" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="32" r="3" fill="#38bdf8" />
          <circle cx="128" cy="18" r="4" fill="#dbe6fe" />
          <defs>
            <linearGradient id="es-edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2548ea" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
        {icon && <span className="absolute -right-2 -bottom-1">{icon}</span>}
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
