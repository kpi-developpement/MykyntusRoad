"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRightLeft,
  CheckCheck,
  CircleDashed,
  FolderOpen,
  Inbox,
  RefreshCw,
  Shuffle,
  Sparkles,
  UserMinus,
  UserPlus,
  UsersRound,
  Zap,
} from "lucide-react";
import { Avatar1 } from "@/shared/components/avatar/Avatar1/Avatar1";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { IconButton } from "@/shared/components/button/IconButton/IconButton";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { KpiCard } from "@/shared/components/card/KpiCard/KpiCard";
import { Magnetic } from "@/shared/components/motion/Magnetic/Magnetic";
import { ProgressRing } from "@/shared/components/chart/ProgressRing/ProgressRing";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider/ConfirmProvider";
import { EmptyState } from "@/shared/components/feedback/EmptyState/EmptyState";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { DateFilter } from "@/shared/components/filters/DateFilter/DateFilter";
import { FlagBadge } from "@/shared/components/flag/FlagBadge/FlagBadge";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { SegmentedControl } from "@/shared/components/segmented/SegmentedControl/SegmentedControl";
import { Surface } from "@/shared/components/surface/Surface/Surface";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { useFlags } from "@/shared/hooks/useFlags";
import { useTilt } from "@/shared/hooks/useTilt";
import { teamService } from "@/shared/services/teamService";
import type { DispatchSummary, DossierCriteria, PiloteLoad, Team } from "@/shared/types";
import { cn } from "@/shared/utils/cn";
import { formatDateLong, tomorrow } from "@/shared/utils/date";
import { flagTone } from "@/shared/utils/flagColors";
import { FlagMixBar } from "../../components/dispatch/FlagMixBar";
import { TransferModal } from "../../components/dispatch/TransferModal";

type Mode = "unassigned" | "all";

const nameOf = (p: { fullName: string | null; username: string }) => p.fullName || p.username;

interface DispatchPageProps {
  /** Team dispatched (sécurisation: sécurisation admin; planification / J: admin). */
  team?: Team;
  eyebrow?: string;
  description?: string;
  /** Where the pilots of the team are managed. */
  pilotesHref?: string;
  /** Default date of the scope. */
  initialDate?: string;
  /** Extra header content (e.g. team switch). */
  headerExtra?: React.ReactNode;
  /** Only the dossiers of this imported file (dispatch again what is not treated). */
  initialBatch?: number | null;
}

/**
 * Equitable dispatch of a team's work between the selected pilots, then live changes
 * (transfer, removal, one-by-one reassignment from the tables).
 */
export function SecDispatchPage({
  team = "SECURISATION",
  eyebrow = "Sécurisation",
  description = "Choisissez les pilotes : les dossiers sont répartis à parts égales et chacun reçoit sa part de P1, P2, GEM, TH… Modifiez ensuite la répartition à tout moment.",
  pilotesHref = "/securisation/pilotes",
  initialDate,
  headerExtra,
  initialBatch = null,
}: DispatchPageProps = {}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { flags } = useFlags();
  const [date, setDate] = useState(initialDate ?? tomorrow());
  const [scopeFlags, setScopeFlags] = useState<string[]>([]);
  const [batch, setBatch] = useState<number | null>(initialBatch);
  const [summary, setSummary] = useState<DispatchSummary | null>(null);
  const [token, setToken] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mode, setMode] = useState<Mode>("unassigned");
  const [running, setRunning] = useState(false);
  const [burst, setBurst] = useState(0);
  const [transferFrom, setTransferFrom] = useState<PiloteLoad | null>(null);

  const criteria = useMemo<DossierCriteria>(
    () => ({
      date,
      search: "",
      filters: [
        ...(scopeFlags.length ? [{ key: "flags", values: scopeFlags }] : []),
        ...(batch ? [{ key: "batch", values: [String(batch)] }] : []),
      ],
      sort: null,
      page: 0,
      size: 1,
    }),
    [date, scopeFlags, batch],
  );

  const currentKey = JSON.stringify([criteria, token]);
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    const key = JSON.stringify([criteria, token]);
    teamService
      .summary(team, criteria)
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
        // all active pilots selected by default
        setSelected((sel) => sel ?? s.pilotes.filter((p) => p.active).map((p) => p.username));
      })
      .catch((e: Error) => !cancelled && toast.error("Chargement impossible", e.message))
      .finally(() => !cancelled && setLoadedKey(key));
    return () => {
      cancelled = true;
    };
  }, [criteria, token, toast, team]);

  const reload = useCallback(() => setToken((t) => t + 1), []);
  const pilotes = useMemo(() => summary?.pilotes ?? [], [summary]);
  const active = pilotes.filter((p) => p.active);
  const chosen = (selected ?? []).filter((u) => active.some((p) => p.username === u));

  // what the dispatch will do (same rule as the server: equal remaining work)
  const preview = useMemo(() => {
    if (!summary) return { toDispatch: 0, rows: [] as { p: PiloteLoad; base: number; add: number }[] };
    const sel = active.filter((p) => chosen.includes(p.username));
    const base = new Map(sel.map((p) => [p.username, mode === "unassigned" ? p.assigned - p.treated : 0]));
    // dossiers of a deactivated (or deleted) pilot are dispatched again too
    const inactiveUntreated = pilotes.filter((p) => !p.active).reduce((s, p) => s + (p.assigned - p.treated), 0);
    const toDispatch =
      mode === "unassigned" ? summary.unassigned - countTreatedUnassigned(summary) + inactiveUntreated : summary.total - summary.treated;
    const add = new Map<string, number>(sel.map((p) => [p.username, 0]));
    for (let i = 0; i < Math.max(0, toDispatch) && sel.length; i++) {
      let best = sel[0].username;
      for (const p of sel) {
        const load = (base.get(p.username) ?? 0) + (add.get(p.username) ?? 0);
        const bestLoad = (base.get(best) ?? 0) + (add.get(best) ?? 0);
        if (load < bestLoad) best = p.username;
      }
      add.set(best, (add.get(best) ?? 0) + 1);
    }
    return { toDispatch: Math.max(0, toDispatch), rows: sel.map((p) => ({ p, base: base.get(p.username) ?? 0, add: add.get(p.username) ?? 0 })) };
  }, [summary, active, pilotes, chosen, mode]);

  const maxBar = Math.max(1, ...preview.rows.map((r) => r.base + r.add));

  async function runDispatch() {
    if (!chosen.length) return;
    if (mode === "all") {
      const ok = await confirm({
        title: "Tout redistribuer ?",
        description: "Tous les dossiers non traités de la sélection sont répartis à nouveau entre les pilotes choisis. Les dossiers déjà traités restent à leur pilote.",
        confirmLabel: "Redistribuer",
      });
      if (!ok) return;
    }
    setRunning(true);
    try {
      const res = await teamService.dispatch(team, criteria, chosen, mode === "unassigned");
      if (res.summary) setSummary(res.summary);
      if (res.moved > 0) {
        setBurst((b) => b + 1);
        toast.success(`${res.moved} dossier(s) dispatchés`, `Entre ${chosen.length} pilote(s), drapeaux répartis équitablement`);
      } else {
        toast.info("Rien à dispatcher", "Tous les dossiers ont déjà un pilote actif.");
      }
    } catch (e) {
      toast.error("Dispatch impossible", e instanceof Error ? e.message : undefined);
    } finally {
      setRunning(false);
    }
  }

  async function unassign(p: PiloteLoad | null) {
    const ok = await confirm({
      title: p ? `Retirer les dossiers de ${nameOf(p)} ?` : "Vider le dispatch ?",
      description: p
        ? "Ses dossiers non traités repassent « non attribués » (vous pourrez les dispatcher à nouveau)."
        : "Tous les dossiers non traités de la sélection repassent « non attribués ».",
      confirmLabel: "Retirer",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await teamService.unassign(team, criteria, p?.username ?? null);
      if (res.summary) setSummary(res.summary);
      toast.success(`${res.moved} dossier(s) retirés`);
    } catch (e) {
      toast.error("Opération impossible", e instanceof Error ? e.message : undefined);
    }
  }

  async function transfer(to: string[], count: number | null, includeTreated: boolean) {
    if (!transferFrom) return;
    try {
      const res = await teamService.transfer(team, criteria, transferFrom.username, to, count, includeTreated);
      if (res.summary) setSummary(res.summary);
      toast.success(`${res.moved} dossier(s) transférés`, `Depuis ${nameOf(transferFrom)}`);
      setTransferFrom(null);
    } catch (e) {
      toast.error("Transfert impossible", e instanceof Error ? e.message : undefined);
    }
  }

  const toggleScopeFlag = (code: string) => setScopeFlags((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Dispatch"
        description={description}
        icon={<Shuffle />}
        actions={
          <>
            {headerExtra}
            <LinkButton href={pilotesHref} variant="secondary" leftIcon={<UserPlus />}>
              Pilotes
            </LinkButton>
            <IconButton variant="secondary" label="Actualiser" onClick={reload}>
              <RefreshCw className={cn(loading && "animate-spin")} />
            </IconButton>
          </>
        }
      />

      {/* scope */}
      <Surface className="mb-5 flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
        <DateFilter value={date} onChange={setDate} />
        <span className="hidden h-6 w-px bg-slate-200 sm:block" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">Périmètre</span>
        <div className="scroll-thin flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
          {flags.map((f) => {
            const on = scopeFlags.includes(f.code);
            return (
              <button
                key={f.code}
                type="button"
                onClick={() => toggleScopeFlag(f.code)}
                aria-pressed={on}
                title={f.label}
                className={cn("shrink-0 rounded-lg transition-all duration-200", on ? "scale-105 ring-2 ring-brand-500 ring-offset-1" : "opacity-70 hover:opacity-100")}
              >
                <FlagBadge code={f.code} flag={f} />
              </button>
            );
          })}
        </div>
        {batch && (
          <Button1 variant="secondary" size="xs" onClick={() => setBatch(null)} title="Retirer le filtre fichier">
            Fichier n° {batch} ✕
          </Button1>
        )}
        {scopeFlags.length > 0 && (
          <Button1 variant="ghost" size="xs" onClick={() => setScopeFlags([])}>
            Tous les dossiers
          </Button1>
        )}
      </Surface>

      {/* counters */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Dossiers" value={summary?.total ?? 0} icon={FolderOpen} tone="slate" hint={date ? `Pour le ${formatDateLong(date)}` : "Toutes les dates"} index={0} />
        <KpiCard label="Non attribués" value={summary?.unassigned ?? 0} total={summary?.total} icon={Inbox} tone="sky" hint="À dispatcher" index={1} />
        <KpiCard label="Traités" value={summary?.treated ?? 0} total={summary?.total} icon={CheckCheck} tone="cyan" hint={team === "SECURISATION" ? "Etat final saisi" : team === "PLANIFICATION" ? "Colonnes J-1 remplies" : "Dossier clôturé"} index={2} />
        <KpiCard label="Pilotes actifs" value={active.length} icon={UsersRound} tone="brand" hint={`${chosen.length} sélectionné(s)`} index={3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------ new dispatch */}
        <Surface corners className="relative rounded-3xl p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-brand-600 uppercase">Étape 1</p>
              <h2 className="font-display text-lg font-semibold tracking-tight text-slate-950">Choisir les pilotes</h2>
            </div>
            <div className="flex gap-1">
              <Button1 variant="ghost" size="xs" onClick={() => setSelected(active.map((p) => p.username))}>
                Tous
              </Button1>
              <Button1 variant="ghost" size="xs" onClick={() => setSelected([])}>
                Aucun
              </Button1>
            </div>
          </div>

          {summary === null ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={<UsersRound />}
              title="Aucun pilote actif"
              description={team === "SECURISATION" ? "Créez vos pilotes sécurisation pour pouvoir leur dispatcher les dossiers." : "Créez les comptes de l'équipe (page Utilisateurs) pour pouvoir leur dispatcher les dossiers."}
              action={
                <LinkButton href={pilotesHref} leftIcon={<UserPlus />}>
                  Créer un pilote
                </LinkButton>
              }
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {active.map((p) => {
                const on = chosen.includes(p.username);
                return (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => setSelected(on ? chosen.filter((u) => u !== p.username) : [...chosen, p.username])}
                    aria-pressed={on}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition-all duration-300 ease-out-expo",
                      on
                        ? "bg-linear-to-br from-brand-50 to-white shadow-[0_12px_26px_-16px_rgb(37_72_234/0.8)] ring-2 ring-brand-500"
                        : "bg-white ring-slate-200 hover:-translate-y-0.5 hover:ring-slate-300",
                    )}
                  >
                    <span className="relative">
                      <Avatar1 name={nameOf(p)} size="sm" />
                      <span
                        className={cn(
                          "absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full text-white ring-2 ring-white transition-transform duration-300",
                          on ? "scale-100 bg-brand-600" : "scale-0 bg-slate-300",
                        )}
                      >
                        <CheckCheck className="size-2.5" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{nameOf(p)}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {p.assigned - p.treated} en cours · {p.treated} traité(s)
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 mb-4">
            <p className="font-mono text-[10px] tracking-[0.22em] text-brand-600 uppercase">Étape 2</p>
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight text-slate-950">Que répartir ?</h2>
            <SegmentedControl
              value={mode}
              onChange={setMode}
              ariaLabel="Mode de dispatch"
              options={[
                { value: "unassigned", label: "Les non attribués", icon: Inbox },
                { value: "all", label: "Tout redistribuer", icon: Shuffle },
              ]}
            />
            <p className="mt-2 text-xs text-slate-500">
              {mode === "unassigned"
                ? "Seuls les dossiers sans pilote (ou d'un pilote désactivé) sont répartis, en complétant d'abord les pilotes les moins chargés."
                : "Tous les dossiers non traités sont répartis à nouveau, à parts égales. Les dossiers traités ne bougent pas."}
            </p>
          </div>

          {/* preview */}
          <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70 ring-inset">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Aperçu</p>
              <p className="font-mono text-[10px] text-slate-500">
                <span className="font-semibold text-brand-700">{preview.toDispatch}</span> dossier(s) à répartir
              </p>
            </div>
            {preview.rows.length === 0 ? (
              <p className="text-xs text-slate-500">Sélectionnez au moins un pilote.</p>
            ) : (
              <ul className="space-y-2">
                {preview.rows.map(({ p, base, add }) => (
                  <li key={p.username} className="flex items-center gap-3">
                    <span className="w-28 truncate text-xs font-medium text-slate-700">{nameOf(p)}</span>
                    <span className="relative flex h-3 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                      <span className="h-full bg-brand-600 transition-[width] duration-500 ease-out-expo" style={{ width: `${(base / maxBar) * 100}%` }} />
                      <span className="stripes h-full bg-sky-400 transition-[width] duration-500 ease-out-expo" style={{ width: `${(add / maxBar) * 100}%` }} />
                    </span>
                    <span className="w-16 text-right font-mono text-[11px] tabular-nums text-slate-600">
                      {base}
                      {add > 0 && <span className="font-semibold text-sky-600"> +{add}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative mt-5">
            <Magnetic strength={0.08} className="w-full">
              <Button1
                size="lg"
                className="w-full"
                leftIcon={<Zap />}
                loading={running}
                disabled={!chosen.length || preview.toDispatch === 0}
                onClick={runDispatch}
              >
                Dispatcher {preview.toDispatch} dossier(s) entre {chosen.length} pilote(s)
              </Button1>
            </Magnetic>
            <Burst key={burst} active={burst > 0} />
          </div>
        </Surface>

        {/* ------------------------------------------------ board */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.24em] text-brand-600 uppercase">
              <span className="h-px w-6 bg-linear-to-r from-brand-600 to-sky-400" />
              Répartition actuelle
            </h2>
            {summary && summary.total - summary.unassigned > 0 && (
              <Button1 variant="ghost" size="xs" leftIcon={<UserMinus />} className="text-rose-600 hover:bg-rose-50" onClick={() => unassign(null)}>
                Vider
              </Button1>
            )}
          </div>

          {summary === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 [perspective:1200px]">
              <UnassignedCard summary={summary} />
              <AnimatePresence initial={false}>
                {pilotes
                  .filter((p) => p.active || p.assigned > 0)
                  .map((p, i) => (
                    <LoadCard key={p.username} load={p} index={i} onTransfer={() => setTransferFrom(p)} onUnassign={() => unassign(p)} />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <TransferModal from={transferFrom} pilotes={pilotes} onClose={() => setTransferFrom(null)} onConfirm={transfer} />
    </>
  );
}

/** Unassigned dossiers of treated ones are not known per dossier: the server only counts them globally. */
function countTreatedUnassigned(summary: DispatchSummary): number {
  const treatedAssigned = summary.pilotes.reduce((s, p) => s + p.treated, 0);
  return Math.max(0, summary.treated - treatedAssigned);
}

function UnassignedCard({ summary }: { summary: DispatchSummary }) {
  const { byCode } = useFlags();
  const entries = Object.entries(summary.unassignedFlags);
  return (
    <motion.div layout className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#0b1347,#14206e_60%,#1d37d7)] p-5 text-white shadow-[0_24px_50px_-26px_rgb(10_16_51/0.9)]">
      <div aria-hidden className="grid-lines absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_85%_10%,black,transparent_65%)]" />
      <div className="relative flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          {summary.unassigned > 0 ? <CircleDashed className="size-6 animate-spin-slow text-sky-300" /> : <Sparkles className="size-6 text-emerald-300" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.22em] text-sky-300 uppercase">Non attribués</p>
          <p className="font-display text-3xl font-bold tabular-nums">{summary.unassigned}</p>
        </div>
        <div className="flex max-w-[55%] flex-wrap justify-end gap-1">
          {entries.length === 0 ? (
            <span className="text-xs text-brand-200">{summary.unassigned > 0 ? "Sans drapeau" : "Tout est dispatché"}</span>
          ) : (
            entries.map(([code, n]) => (
              <span key={code} className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-white/10">
                <span className={cn("size-1.5 rounded-full", flagTone(byCode.get(code)?.color).solid)} />
                {code} <span className="text-brand-200">{n}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LoadCard({ load, index, onTransfer, onUnassign }: { load: PiloteLoad; index: number; onTransfer: () => void; onUnassign: () => void }) {
  const ref = useTilt<HTMLDivElement>(5);
  const remaining = load.assigned - load.treated;
  const pct = load.assigned ? Math.round((load.treated / load.assigned) * 100) : 0;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, rotateX: -18, y: 14 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ delay: Math.min(index, 10) * 0.04, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
    >
      <div ref={ref} className={cn("tilt surface relative rounded-3xl p-4", !load.active && "opacity-75")}>
        <span aria-hidden className="tilt-glare" />
        <div className="flex items-center gap-3">
          <span className="tilt-pop">
            <Avatar1 name={nameOf(load)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">
              {nameOf(load)}
              {!load.active && <span className="rounded-full bg-slate-100 px-1.5 font-mono text-[9px] text-slate-500 uppercase">désactivé</span>}
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              <span className="font-semibold text-slate-800 tabular-nums">{load.assigned}</span> attribué(s) ·{" "}
              <span className="text-brand-600 tabular-nums">{remaining}</span> restant(s)
            </p>
          </div>
          <ProgressRing value={pct} size={46} stroke={4} from="#38bdf8" to="#2548ea">
            <span className="font-mono text-[10px] font-bold text-slate-700 tabular-nums">{pct}%</span>
          </ProgressRing>
          <div className="flex flex-col gap-1">
            <IconButton label="Transférer ses dossiers" size="sm" onClick={onTransfer} disabled={load.assigned === 0}>
              <ArrowRightLeft />
            </IconButton>
            <IconButton label="Retirer ses dossiers" size="sm" onClick={onUnassign} disabled={remaining === 0} className="hover:bg-rose-50 hover:text-rose-600">
              <UserMinus />
            </IconButton>
          </div>
        </div>
        <div className="mt-3">
          <FlagMixBar flags={load.flags} total={load.assigned} />
        </div>
      </div>
    </motion.div>
  );
}

/** Short celebration after a dispatch: 18 sparks, transform / opacity only. */
function Burst({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ["#38bdf8", "#2548ea", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6"];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 70 + (i % 3) * 30;
        return (
          <span
            key={i}
            className="absolute size-2 rounded-[2px]"
            style={
              {
                background: colors[i % colors.length],
                animation: `burst 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 8}ms both`,
                "--bx": `${Math.cos(angle) * dist * 2.2}px`,
                "--by": `${Math.sin(angle) * dist}px`,
                "--br": `${i * 40}deg`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
