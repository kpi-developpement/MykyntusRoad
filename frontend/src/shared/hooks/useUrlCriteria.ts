"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnFilter } from "../types";

/**
 * Table criteria given in the address (links of the dashboard and of the files page):
 * ?date=yyyy-MM-dd ("" = every date), ?batch=<file id>, ?delay=LATE|SOON|ON_TIME|DONE, ?route=PLANIFICATION.
 */
export function useUrlCriteria(defaultDate: string) {
  const params = useSearchParams();
  const key = params.toString();
  return useMemo(() => {
    const p = new URLSearchParams(key);
    const filters: ColumnFilter[] = [];
    const batch = p.get("batch");
    if (batch) filters.push({ key: "batch", values: batch.split(",") });
    const delay = p.get("delay");
    if (delay) filters.push({ key: "delay", values: delay.split(",") });
    const route = p.get("route");
    if (route) filters.push({ key: "route", values: [route] });
    // a file spans several dates: show them all unless a date is given
    const date = p.has("date") ? (p.get("date") ?? "") : batch ? "" : defaultDate;
    return { date, filters, batch: batch ? Number(batch) : null, key };
  }, [key, defaultDate]);
}
