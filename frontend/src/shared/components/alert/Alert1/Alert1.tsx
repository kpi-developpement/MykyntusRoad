import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../../../utils/cn";

type Tone = "error" | "success" | "info" | "warning";

interface Alert1Props {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: "bg-rose-50/80 text-rose-800 ring-rose-200", icon: CircleAlert },
  success: { box: "bg-emerald-50/80 text-emerald-800 ring-emerald-200", icon: CircleCheck },
  info: { box: "bg-brand-50/80 text-brand-900 ring-brand-200", icon: Info },
  warning: { box: "bg-amber-50/80 text-amber-900 ring-amber-200", icon: TriangleAlert },
};

export function Alert1({ tone = "info", title, children, onClose, className }: Alert1Props) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div role="alert" className={cn("flex animate-slide-up items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="grid size-6 place-items-center rounded-md opacity-60 transition hover:bg-black/5 hover:opacity-100" aria-label="Fermer">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
