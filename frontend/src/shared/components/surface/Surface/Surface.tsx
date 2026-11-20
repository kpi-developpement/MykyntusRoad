import type { HTMLAttributes, PointerEvent } from "react";
import { cn } from "../../../utils/cn";

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
  /** Light following the cursor, inside the card and on its edge. */
  spotlight?: boolean;
  /** HUD brackets in two corners. */
  corners?: boolean;
  /** Lifts on hover. */
  interactive?: boolean;
  /** Stronger shadow (floating panels). */
  elevated?: boolean;
}

/** Writes the cursor position as CSS variables (pointermove is already frame-aligned). */
function trackPointer(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  el.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

/**
 * White "holo" panel: gradient hairline edge, layered shadow and optional
 * cursor spotlight / HUD corners. Pure CSS, no re-render on mouse move.
 */
export function Surface({ as: Tag = "div", spotlight, corners, interactive, elevated, className, children, onPointerMove, ...rest }: SurfaceProps) {
  return (
    <Tag
      {...rest}
      onPointerMove={
        spotlight
          ? (e: PointerEvent<HTMLElement>) => {
              trackPointer(e);
              onPointerMove?.(e);
            }
          : onPointerMove
      }
      className={cn(elevated ? "surface-pop" : "surface", "relative", interactive && "surface-interactive", className)}
    >
      {spotlight && (
        <>
          <span aria-hidden className="spotlight" />
          <span aria-hidden className="spotlight-edge" />
        </>
      )}
      {corners && <span aria-hidden className="hud-corners" />}
      {children}
    </Tag>
  );
}
