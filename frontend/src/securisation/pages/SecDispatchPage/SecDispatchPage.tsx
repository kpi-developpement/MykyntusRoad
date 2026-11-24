"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowRightLeft, Inbox, ListChecks, RefreshCw, Shuffle, UserMinus, UserPlus, X } from "lucide-react";
import { Avatar1 } from "@/shared/components/avatar/Avatar1/Avatar1";
import { IconButton } from "@/shared/components/button/IconButton/IconButton";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider/ConfirmProvider";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { DateFilter } from "@/shared/components/filters/DateFilter/DateFilter";
import { FlagBadge } from "@/shared/components/flag/FlagBadge/FlagBadge";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { Magnetic } from "@/shared/components/motion/Magnetic/Magnetic";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { useFlags } from "@/shared/hooks/useFlags";
import { teamService } from "@/shared/services/teamService";
import type { DispatchSummary, DossierCriteria, PiloteLoad, Team } from "@/shared/types";
import { cn } from "@/shared/utils/cn";
import { formatDateLong, tomorrow } from "@/shared/utils/date";
import { FlagMixBar } from "../../components/dispatch/FlagMixBar";
import { TransferModal } from "../../components/dispatch/TransferModal";
import styles from "./SecDispatchPage.module.css";

type Mode = "unassigned" | "all";

const nameOf = (p: { fullName: string | null; username: string }) => p.fullName || p.username;
/** Critically damped: numbers and badges settle without wobbling. */
const SPRING = { type: "spring", stiffness: 480, damping: 40 } as const;

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

/** Table showing the dossiers of one pilot (to change them one by one). */
function dossiersHref(team: Team, username: string, date: string): string {
  const q = `date=${date}&pilot=${encodeURIComponent(username)}&team=${team}`;
  if (team === "SECURISATION") return `/securisation/espace?${q}`;
  if (team === "PLANIFICATION") return `/admin/suivi?${q}&route=PLANIFICATION`;
  return `/admin/suivi?${q}`;
}

/**
 * Dispatch of a team's work, as one readable flow: which dossiers, between whom, how; then the team,
 * one card per pilot with written actions (see his dossiers, transfer them, take them back).
 */
export function SecDispatchPage({
  team = "SECURISATION",
  eyebrow = "Sécurisation",
  description = "Répartissez les dossiers à parts égales entre les pilotes : chacun reçoit aussi sa part de P1, P2, GEM, TH… Ajustez ensuite pilote par pilote.",
  pilotesHref = "/securisation/pilotes",
  initialDate,
  headerExtra,
  initialBatch = null,
}: DispatchPageProps = {}) {
  const toast = useToast();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
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
    if (!summary) return { toDispatch: 0, add: new Map<string, number>() };
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
    return { toDispatch: Math.max(0, toDispatch), add };
  }, [summary, active, pilotes, chosen, mode]);

  async function runDispatch() {
    if (!chosen.length) return;
    if (mode === "all") {
      const ok = await confirm({
        title: "Tout redistribuer ?",
        description: "Tous les dossiers non traités sont répartis à nouveau entre les pilotes choisis. Les dossiers déjà traités restent à leur pilote.",
        confirmLabel: "Tout redistribuer",
        cancelLabel: "Garder la répartition",
      });
      if (!ok) return;
    }
    setRunning(true);
    try {
      const res = await teamService.dispatch(team, criteria, chosen, mode === "unassigned");
      if (res.summary) setSummary(res.summary);
      if (res.moved > 0) toast.success(`${res.moved} dossier(s) répartis`, `Entre ${chosen.length} pilote(s), drapeaux compris`);
      else toast.info("Rien à répartir", "Tous les dossiers ont déjà un pilote actif.");
    } catch (e) {
      toast.error("Répartition impossible", e instanceof Error ? e.message : undefined);
    } finally {
      setRunning(false);
    }
  }

  async function unassign(p: PiloteLoad | null) {
    const ok = await confirm({
      title: p ? `Reprendre les dossiers de ${nameOf(p)} ?` : "Reprendre tous les dossiers ?",
      description: p
        ? "Ses dossiers non traités redeviennent « non attribués » : vous pourrez les répartir à nouveau."
        : "Tous les dossiers non traités redeviennent « non attribués ».",
      confirmLabel: "Reprendre",
      cancelLabel: "Annuler",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await teamService.unassign(team, criteria, p?.username ?? null);
      if (res.summary) setSummary(res.summary);
      toast.success(`${res.moved} dossier(s) repris`);
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

  const toggle = (u: string) => setSelected(chosen.includes(u) ? chosen.filter((x) => x !== u) : [...chosen, u]);
  const toggleScopeFlag = (code: string) => setScopeFlags((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));

  const total = summary?.total ?? 0;
  const treated = summary?.treated ?? 0;
  const unassigned = summary?.unassigned ?? 0;
  const assignedOpen = Math.max(0, total - treated - unassigned + countTreatedUnassigned(summary));
  const pct = (n: number) => `${(n / Math.max(total, 1)) * 100}%`;

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
              Gérer l&apos;équipe
            </LinkButton>
            <IconButton variant="secondary" label="Actualiser" onClick={reload}>
              <RefreshCw className={cn(loading && "animate-spin")} />
            </IconButton>
          </>
        }
      />

      {/* which dossiers */}
      <div className={styles.scope}>
        <span className={styles.scopeLabel}>Dossiers du</span>
        <DateFilter value={date} onChange={setDate} />
        <div className={styles.flags} role="group" aria-label="Limiter à certains drapeaux">
          {flags.map((f) => (
            <button
              key={f.code}
              type="button"
              aria-pressed={scopeFlags.includes(f.code)}
              title={`Seulement ${f.label}`}
              className={cn(styles.flagBtn, scopeFlags.includes(f.code) && styles.flagOn)}
              onClick={() => toggleScopeFlag(f.code)}
            >
              <FlagBadge code={f.code} flag={f} />
            </button>
          ))}
        </div>
        {batch && (
          <button type="button" className={styles.fileChip} onClick={() => setBatch(null)} title="Retirer : tous les dossiers de la date">
            Fichier n° {batch} <X aria-hidden />
          </button>
        )}
      </div>

      {/* the flow: what → between whom → how */}
      <div className={styles.flow}>
        <section className={styles.step} aria-label="Dossiers à répartir">
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>1</span>
            <h2 className={styles.stepTitle}>À répartir</h2>
          </div>
          {summary === null ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : (
            <>
              <div>
                <motion.div key={preview.toDispatch} className={styles.big} initial={reduce ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING}>
                  {preview.toDispatch}
                </motion.div>
                <p className={styles.bigLabel}>
                  dossier(s) {mode === "unassigned" ? "sans pilote" : "non traités"}, {date ? formatDateLong(date) : "toutes dates"}
                </p>
              </div>
              <div className={styles.split} aria-hidden>
                <span style={{ width: pct(treated), background: "#12b5a6" }} />
                <span style={{ width: pct(assignedOpen), background: "#2f6bff" }} />
                <span style={{ width: pct(unassigned), background: "#cbd5e1" }} />
              </div>
              <div className={styles.splitLegend}>
                <span>
                  <i style={{ background: "#12b5a6" }} /> {treated} traité(s)
                </span>
                <span>
                  <i style={{ background: "#2f6bff" }} /> {assignedOpen} en cours
                </span>
                <span>
                  <i style={{ background: "#cbd5e1" }} /> {unassigned} sans pilote
                </span>
              </div>
              {Object.keys(summary.unassignedFlags).length > 0 && <FlagMixBar flags={summary.unassignedFlags} total={unassigned} />}
            </>
          )}
        </section>

        <span className={styles.arrow} aria-hidden>
          <ArrowRight />
        </span>

        <section className={styles.step} aria-label="Pilotes qui reçoivent">
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>2</span>
            <h2 className={styles.stepTitle}>Entre qui ?</h2>
            <button type="button" className={styles.linkBtn} onClick={() => setSelected(chosen.length === active.length ? [] : active.map((p) => p.username))}>
              {chosen.length === active.length ? "Aucun" : "Tous"}
            </button>
          </div>
          {summary === null ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : active.length === 0 ? (
            <p className={styles.hint}>Aucun pilote actif. Créez les comptes de l&apos;équipe pour pouvoir répartir.</p>
          ) : (
            <div className={styles.people}>
              {active.map((p) => {
                const on = chosen.includes(p.username);
                const add = preview.add.get(p.username) ?? 0;
                return (
                  <button key={p.username} type="button" aria-pressed={on} className={cn(styles.person, on && styles.personOn)} onClick={() => toggle(p.username)}>
                    <Avatar1 name={nameOf(p)} size="sm" />
                    <span className={styles.personText}>
                      <span className={styles.personName} style={{ display: "block" }}>
                        {nameOf(p)}
                      </span>
                      <span className={styles.personLoad}>{p.assigned - p.treated} en cours</span>
                    </span>
                    <AnimatePresence>
                      {on && add > 0 && (
                        <motion.span
                          key={add}
                          className={styles.plus}
                          initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.1 } }}
                          transition={SPRING}
                        >
                          +{add}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          )}
          <p className={styles.hint}>Le chiffre bleu montre combien chaque pilote va recevoir.</p>
        </section>

        <span className={styles.arrow} aria-hidden>
          <ArrowRight />
        </span>

        <section className={styles.step} aria-label="Comment répartir">
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>3</span>
            <h2 className={styles.stepTitle}>Comment ?</h2>
          </div>
          <div className={styles.options} role="radiogroup" aria-label="Mode de répartition">
            <ModeOption
              on={mode === "unassigned"}
              onClick={() => setMode("unassigned")}
              title="Compléter"
              text="Seuls les dossiers sans pilote sont répartis, en commençant par les pilotes les moins chargés."
            />
            <ModeOption
              on={mode === "all"}
              onClick={() => setMode("all")}
              title="Tout redistribuer"
              text="Tous les dossiers non traités sont répartis à nouveau, à parts égales."
            />
          </div>
          <div className={styles.go}>
            <Magnetic strength={0.08} className="w-full">
              <button type="button" className={styles.goBtn} disabled={!chosen.length || preview.toDispatch === 0 || running} onClick={runDispatch}>
                <Shuffle aria-hidden />
                {running ? "Répartition…" : preview.toDispatch === 0 ? "Rien à répartir" : `Répartir ${preview.toDispatch} dossier(s)`}
              </button>
            </Magnetic>
          </div>
        </section>
      </div>

      {/* the team */}
      <div className={styles.teamHead}>
        <h2 className={styles.teamTitle}>L&apos;équipe aujourd&apos;hui</h2>
        {summary && total - unassigned > 0 && (
          <button type="button" className={styles.clearAll} onClick={() => unassign(null)}>
            Reprendre tous les dossiers
          </button>
        )}
      </div>

      {summary === null ? (
        <div className={styles.team}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className={styles.team}>
          <div className={cn(styles.card, styles.cardUnassigned)}>
            <div className={styles.cardHead}>
              <span className={styles.unassignedIcon}>
                <Inbox aria-hidden />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className={styles.cardName}>Sans pilote</div>
                <div className={styles.cardSub}>{unassigned === 0 ? "Tout est réparti" : "En attente de répartition"}</div>
              </div>
            </div>
            <div className={styles.nums}>
              <Num label="dossiers" value={unassigned} />
              <Num label="traités" value={countTreatedUnassigned(summary)} />
              <Num label="à répartir" value={Math.max(0, unassigned - countTreatedUnassigned(summary))} />
            </div>
            {unassigned > 0 && <FlagMixBar flags={summary.unassignedFlags} total={unassigned} />}
          </div>

          {pilotes
            .filter((p) => p.active || p.assigned > 0)
            .map((p, i) => (
              <motion.div
                key={p.username}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: Math.min(i, 10) * 0.04 }}
              >
                <PilotCard
                  load={p}
                  href={dossiersHref(team, p.username, date)}
                  onTransfer={() => setTransferFrom(p)}
                  onUnassign={() => unassign(p)}
                />
              </motion.div>
            ))}
        </div>
      )}

      <TransferModal from={transferFrom} pilotes={pilotes} onClose={() => setTransferFrom(null)} onConfirm={transfer} />
    </>
  );
}

function ModeOption({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={cn(styles.option, on && styles.optionOn)} onClick={onClick}>
      <span className={styles.radio}>{on && <motion.i layoutId="dispatch-mode" transition={SPRING} />}</span>
      <span>
        <span className={styles.optionTitle} style={{ display: "block" }}>
          {title}
        </span>
        <span className={styles.optionText}>{text}</span>
      </span>
    </button>
  );
}

function Num({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.num}>
      <div className={styles.numValue}>{value}</div>
      <div className={styles.numLabel}>{label}</div>
    </div>
  );
}

function PilotCard({ load, href, onTransfer, onUnassign }: { load: PiloteLoad; href: string; onTransfer: () => void; onUnassign: () => void }) {
  const remaining = load.assigned - load.treated;
  const done = load.assigned ? load.treated / load.assigned : 0;
  return (
    <div className={cn(styles.card, !load.active && styles.cardInactive)}>
      <div className={styles.cardHead}>
        <Avatar1 name={nameOf(load)} />
        <div style={{ minWidth: 0 }}>
          <div className={styles.cardName}>{nameOf(load)}</div>
          <div className={styles.cardSub}>{!load.active ? "Compte désactivé" : remaining === 0 ? "Rien en cours" : `${Math.round(done * 100)} % traité`}</div>
        </div>
      </div>
      <div className={styles.nums}>
        <Num label="attribués" value={load.assigned} />
        <Num label="en cours" value={remaining} />
        <Num label="traités" value={load.treated} />
      </div>
      <div className={styles.progress} aria-hidden>
        <span style={{ transform: `scaleX(${done})` }} />
      </div>
      {load.assigned > 0 && <FlagMixBar flags={load.flags} total={load.assigned} />}
      <div className={styles.actions}>
        <Link href={href} className={styles.action}>
          <ListChecks aria-hidden /> Voir ses dossiers
        </Link>
        <button type="button" className={styles.action} onClick={onTransfer} disabled={load.assigned === 0}>
          <ArrowRightLeft aria-hidden /> Transférer
        </button>
        <button type="button" className={cn(styles.action, styles.danger)} onClick={onUnassign} disabled={remaining === 0}>
          <UserMinus aria-hidden /> Reprendre
        </button>
      </div>
    </div>
  );
}

/** Unassigned dossiers already treated are not known per dossier: the server only counts them globally. */
function countTreatedUnassigned(summary: DispatchSummary | null): number {
  if (!summary) return 0;
  const treatedAssigned = summary.pilotes.reduce((s, p) => s + p.treated, 0);
  return Math.max(0, summary.treated - treatedAssigned);
}
