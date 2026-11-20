"use client";

import { useEffect } from "react";

/** Ctrl (Windows) / Cmd (Mac) + key. */
export const withMod = (key: string) => (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === key;

/** True when the user is typing in a field (shortcuts like "/" must be ignored). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Registers a global keyboard shortcut. `matcher` should be stable (module level). */
export function useHotkey(matcher: (e: KeyboardEvent) => boolean, handler: (e: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (matcher(e)) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [matcher, handler, enabled]);
}
