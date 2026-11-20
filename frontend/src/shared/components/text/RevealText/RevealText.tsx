import { cn } from "../../../utils/cn";

interface RevealTextProps {
  text: string;
  className?: string;
  /** Seconds before the first word. */
  delay?: number;
  /** Seconds between two words. */
  stagger?: number;
}

/**
 * Words rising from a mask, one after the other.
 * Pure CSS animation on transform / opacity (GPU), readable by screen readers.
 */
export function RevealText({ text, className, delay = 0, stagger = 0.06 }: RevealTextProps) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={cn("inline", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={i} className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
            <span className="inline-block animate-word-in" style={{ animationDelay: `${delay + i * stagger}s` }}>
              {word}
            </span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </span>
    </span>
  );
}
