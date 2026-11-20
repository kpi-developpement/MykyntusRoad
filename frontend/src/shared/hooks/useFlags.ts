"use client";

import { useEffect, useSyncExternalStore } from "react";
import { flagService } from "../services/flagService";
import type { Flag } from "../types";

/**
 * Flag definitions shared by the whole app (one request, then cached).
 * A flag created anywhere is immediately available in every table and filter.
 */
let flags: Flag[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function refreshFlags(): Promise<void> {
  loading = flagService
    .list()
    .then((list) => {
      flags = list;
      emit();
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

export function addFlag(flag: Flag) {
  flags = [...(flags ?? []), flag].sort((a, b) => a.position - b.position || a.id - b.id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => flags;
const getServerSnapshot = () => null;

export function useFlags(): { flags: Flag[]; byCode: Map<string, Flag> } {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!flags && !loading) void refreshFlags();
  }, []);
  return { flags: list ?? [], byCode: byCodeOf(list) };
}

let cacheKey: Flag[] | null = null;
let cacheMap = new Map<string, Flag>();
function byCodeOf(list: Flag[] | null): Map<string, Flag> {
  if (list !== cacheKey) {
    cacheKey = list;
    cacheMap = new Map((list ?? []).map((f) => [f.code, f]));
  }
  return cacheMap;
}
