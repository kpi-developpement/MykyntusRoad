"use client";

import { useSearchParams } from "next/navigation";
import { SecDispatchPage } from "./SecDispatchPage";

/** Sécurisation dispatch, optionally limited to a date (?date=) or to the dossiers of a file (?batch=). */
export function SecDispatchRoute() {
  const params = useSearchParams();
  const batch = params.get("batch") ? Number(params.get("batch")) : null;
  const date = params.get("date");
  return <SecDispatchPage key={params.toString()} initialBatch={batch} initialDate={date ?? (batch ? "" : undefined)} />;
}
