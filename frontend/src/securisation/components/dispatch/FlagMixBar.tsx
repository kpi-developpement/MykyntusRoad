"use client";

import { useFlags } from "@/shared/hooks/useFlags";
import { flagTone } from "@/shared/utils/flagColors";

/** Proportional bar of the flags held by a pilot (each segment = one flag, hover = count). */
export function FlagMixBar({ flags, total }: { flags: Record<string, number>; total: number }) {
  const { flags: defs, byCode } = useFlags();
  const order = defs.map((d) => d.code);
  const rank = (code: string) => {
    const i = order.indexOf(code);
    return i < 0 ? 999 : i;
  };
  const entries = Object.entries(flags).sort(([a], [b]) => rank(a) - rank(b));
  const sum = entries.reduce((s, [, n]) => s + n, 0);

  if (sum === 0) {
    return <div className="h-2 rounded-full bg-slate-100" title={total ? "Aucun drapeau" : "Aucun dossier"} />;
  }
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {entries.map(([code, n]) => (
          <span key={code} title={`${code} · ${n}`} className={flagTone(byCode.get(code)?.color).solid} style={{ width: `${(n / sum) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
        {entries.map(([code, n]) => (
          <span key={code} className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
            <span className={`size-1.5 rounded-full ${flagTone(byCode.get(code)?.color).solid}`} />
            <span className="font-semibold text-slate-700">{code}</span>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
