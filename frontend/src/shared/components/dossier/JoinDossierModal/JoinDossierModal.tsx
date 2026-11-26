"use client";

import { useEffect, useState } from "react";
import { Crown, Hand, History, LogOut, UsersRound } from "lucide-react";
import { dossierService } from "../../../services/dossierService";
import { TEAM_LABELS, type DossierRow, type DossierWorkers, type Team } from "../../../types";
import { cn } from "../../../utils/cn";
import { formatDateLong, formatDateTime, formatRelative } from "../../../utils/date";
import { Alert1 } from "../../alert/Alert1/Alert1";
import { Avatar1 } from "../../avatar/Avatar1/Avatar1";
import { Button1 } from "../../button/Button1/Button1";
import { Skeleton } from "../../feedback/Skeleton/Skeleton";
import { Modal1 } from "../../modal/Modal1/Modal1";
import { useToast } from "../../toast/ToastProvider/ToastProvider";

export interface JoinTarget {
  row: DossierRow;
  team: Team;
}

interface JoinDossierModalProps {
  target: JoinTarget | null;
  /** Connected user. */
  me: string;
  onClose: () => void;
  /** New pilots of the dossier after a take / join / leave. */
  onChanged: (row: DossierRow, result: DossierWorkers) => void;
  /** Opens the life cycle of the dossier (everyone's actions). */
  onOpenLifecycle?: (row: DossierRow) => void;
}

/**
 * Confirmation before working on a dossier: who already works on it (lead first), then "Prendre" (nobody
 * yet) or "Rejoindre". A pilot already on it can leave. Everything is written in the life cycle.
 */
export function JoinDossierModal({ target, me, onClose, onChanged, onOpenLifecycle }: JoinDossierModalProps) {
  const toast = useToast();
  // keep the dossier displayed during the closing animation
  const [shown, setShown] = useState<JoinTarget | null>(target);
  const [state, setState] = useState<{ key: string; data: DossierWorkers | null; error: string | null }>({ key: "", data: null, error: null });
  const [busy, setBusy] = useState(false);
  if (target && target !== shown) setShown(target);

  const key = target ? `${target.row.id}:${target.team}` : "";
  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const k = `${target.row.id}:${target.team}`;
    dossierService.workers(target.row.id, target.team).then(
      (data) => !cancelled && setState({ key: k, data, error: null }),
      (e: unknown) => !cancelled && setState({ key: k, data: null, error: e instanceof Error ? e.message : "Chargement impossible" }),
    );
    return () => {
      cancelled = true;
    };
  }, [target]);

  const loading = state.key !== key;
  const workers = loading ? [] : (state.data?.workers ?? []);
  const others = workers.filter((w) => w.username !== me);
  const mine = workers.find((w) => w.username === me);
  const row = shown?.row;
  const team = shown?.team ?? "J";
  // the lead of a dispatched team cannot leave by himself
  const canLeave = !!mine && !(team === "SECURISATION" && mine.lead);

  async function run(action: "join" | "leave") {
    if (!target) return;
    setBusy(true);
    try {
      const res = action === "join" ? await dossierService.join(target.row.id, target.team) : await dossierService.leave(target.row.id, target.team);
      onChanged(target.row, res);
      if (action === "join") {
        toast.success(others.length ? "Vous avez rejoint le dossier" : "Dossier pris en charge", target.row.idExterne);
      } else {
        toast.info("Vous ne travaillez plus sur ce dossier", target.row.idExterne);
      }
      onClose();
    } catch (e) {
      toast.error(action === "join" ? "Impossible de prendre le dossier" : "Impossible de quitter le dossier", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const title = loading ? "Pilotes du dossier" : mine ? "Vous travaillez sur ce dossier" : others.length ? "Rejoindre ce dossier ?" : "Prendre ce dossier ?";

  return (
    <Modal1
      open={!!target}
      onClose={onClose}
      size="sm"
      icon={
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-glow",
            mine ? "bg-linear-to-br from-emerald-500 to-emerald-700" : "bg-linear-to-br from-brand-500 to-brand-700",
          )}
        >
          {others.length && !mine ? <UsersRound className="size-5" /> : <Hand className="size-5" />}
        </span>
      }
      title={title}
      description={
        row && (
          <span>
            <span className="font-mono font-semibold text-slate-700">{row.idExterne}</span>
            <span className="first-letter:uppercase"> · {formatDateLong(row.date)}</span>
          </span>
        )
      }
      footer={
        <>
          {onOpenLifecycle && row && (
            <Button1 variant="ghost" leftIcon={<History />} onClick={() => onOpenLifecycle(row)} className="mr-auto">
              Cycle de vie
            </Button1>
          )}
          {mine ? (
            <>
              {canLeave && (
                <Button1 variant="danger" leftIcon={<LogOut />} loading={busy} onClick={() => run("leave")}>
                  Quitter le dossier
                </Button1>
              )}
              <Button1 variant="secondary" onClick={onClose} autoFocus>
                Fermer
              </Button1>
            </>
          ) : (
            <>
              <Button1 variant="secondary" onClick={onClose}>
                Annuler
              </Button1>
              <Button1 leftIcon={others.length ? <UsersRound /> : <Hand />} loading={busy} disabled={loading || !!state.error} onClick={() => run("join")} autoFocus>
                {others.length ? "Rejoindre" : "Prendre le dossier"}
              </Button1>
            </>
          )}
        </>
      }
    >
      {state.error && !loading ? (
        <Alert1 tone="error">{state.error}</Alert1>
      ) : loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {workers.length > 0 ? (
            <section>
              <p className="mb-2 font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
                Déjà sur ce dossier · {TEAM_LABELS[team]}
              </p>
              <ul className="space-y-1.5">
                {workers.map((w) => (
                  <li
                    key={w.username}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 ring-1",
                      w.username === me ? "bg-emerald-50/70 ring-emerald-200" : "bg-white ring-slate-200/80",
                    )}
                  >
                    <Avatar1 name={w.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                        {w.username === me ? "Vous" : w.name}
                        {w.lead && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            <Crown className="size-2.5" /> principal
                          </span>
                        )}
                      </span>
                      {w.joinedAt && (
                        <span className="block font-mono text-[10px] text-slate-400" title={formatDateTime(w.joinedAt)}>
                          sur le dossier {formatRelative(w.joinedAt)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-slate-200/70">
              Personne ne travaille encore ce dossier : vous en serez le pilote principal.
            </p>
          )}
          {!mine && (
            <p className="text-xs text-slate-500">
              {others.length
                ? "Vous travaillerez à plusieurs sur ce dossier. Chacun voit qui est dessus, et chaque action est enregistrée dans le cycle de vie."
                : "Vous pourrez remplir ses colonnes. Chaque action est enregistrée dans le cycle de vie du dossier."}
            </p>
          )}
        </div>
      )}
    </Modal1>
  );
}
