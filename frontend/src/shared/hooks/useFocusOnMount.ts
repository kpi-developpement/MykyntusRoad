"use client";

import { useEffect, useRef } from "react";

/**
 * Focuses the element once mounted, without scrolling the page or the tables
 * (autoFocus would scroll while the popover is still being positioned).
 */
export function useFocusOnMount<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (enabled) ref.current?.focus({ preventScroll: true });
  }, [enabled]);
  return ref;
}
