import styles from "./KineticTitle.module.css";

interface KineticTitleProps {
  text: string;
  /** Seconds before the first letter. */
  delay?: number;
  className?: string;
}

/**
 * Kinetic headline: letters rise into place one after the other (CSS, transform / opacity only)
 * and ripple when hovered. Words never break in the middle; screen readers get the plain text.
 */
export function KineticTitle({ text, delay = 0, className }: KineticTitleProps) {
  let i = 0;
  const words = text.split(" ");
  return (
    <span className={`${styles.title} ${className ?? ""}`} style={{ "--d": `${delay}s` } as React.CSSProperties}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w}>
            <span className={styles.word}>
              {[...word].map((ch) => (
                <span key={i} className={styles.char} style={{ "--i": i++ } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            {w < words.length - 1 && " "}
          </span>
        ))}
      </span>
    </span>
  );
}
