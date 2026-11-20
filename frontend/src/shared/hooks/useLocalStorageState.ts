"use client";

import { useEffect, useState } from "react";
import { storage } from "../utils/storage";

/** useState persisted in localStorage (per browser). */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => storage.get(key, initial));

  useEffect(() => {
    storage.set(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
