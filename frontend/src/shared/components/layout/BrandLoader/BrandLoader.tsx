import { ScrambleText } from "../../text/ScrambleText/ScrambleText";
import { BrandMark } from "../BrandMark/BrandMark";

/** Full screen loader (session restore, redirects): orbiting rings around the brand mark. */
export function BrandLoader({ label = "Initialisation" }: { label?: string }) {
  return (
    <div className="app-canvas flex h-dvh flex-col items-center justify-center gap-7">
      <div className="relative grid size-28 animate-scale-in place-items-center">
        <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-transparent border-t-brand-500 border-r-sky-400/70 will-change-transform" />
        <span className="absolute inset-3 animate-[spin_2.2s_linear_infinite_reverse] rounded-full border border-transparent border-b-brand-300 border-l-brand-600/60 will-change-transform" />
        <span className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgb(59_102_245/0.18),transparent_70%)]" />
        <BrandMark size="lg" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="h-px w-44 overflow-hidden bg-brand-100">
          <div className="h-full w-1/3 animate-progress bg-linear-to-r from-transparent via-brand-600 to-transparent" />
        </div>
        <ScrambleText text={label.toUpperCase()} className="font-mono text-[11px] tracking-[0.32em] text-brand-700" />
      </div>
    </div>
  );
}
