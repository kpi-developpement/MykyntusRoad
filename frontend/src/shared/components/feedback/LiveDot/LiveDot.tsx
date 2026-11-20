import { cn } from "../../../utils/cn";

const TONES = {
  emerald: { ping: "bg-emerald-400", dot: "bg-emerald-500 shadow-[0_0_8px_rgb(16_185_129/0.8)]" },
  neon: { ping: "bg-sky-400", dot: "bg-sky-400 shadow-[0_0_8px_rgb(56_189_248/0.9)]" },
};

/** Pulsing status dot (transform / opacity animation only). */
export function LiveDot({ tone = "emerald", className }: { tone?: keyof typeof TONES; className?: string }) {
  const t = TONES[tone];
  return (
    <span aria-hidden className={cn("relative flex size-2", className)}>
      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", t.ping)} />
      <span className={cn("relative inline-flex size-2 rounded-full", t.dot)} />
    </span>
  );
}
