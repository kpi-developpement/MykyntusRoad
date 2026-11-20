import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../utils/cn";

interface Pagination1Props {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizes?: number[];
  unit?: string;
}

/** Page numbers with ellipsis: 1 … 4 5 6 … 12 */
function pageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

export function Pagination1({ page, size, totalPages, totalElements, onPageChange, onSizeChange, sizes = [25, 50, 100, 200], unit = "dossiers" }: Pagination1Props) {
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);
  const nav = "grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {from}–{to}
          </span>{" "}
          sur <span className="font-semibold text-slate-800 tabular-nums">{totalElements}</span> {unit}
        </span>
        {onSizeChange && (
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-lg bg-white px-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ring-inset hover:ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            aria-label="Lignes par page"
          >
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button className={nav} disabled={page <= 0} onClick={() => onPageChange(page - 1)} aria-label="Page précédente">
          <ChevronLeft className="size-4" />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "h-8 min-w-8 rounded-lg px-2 font-semibold tabular-nums transition-all",
                p === page ? "bg-brand-600 text-white shadow-glow" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {p + 1}
            </button>
          ),
        )}
        <button className={nav} disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
