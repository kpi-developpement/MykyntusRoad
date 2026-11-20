"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Shuffle, UserPlus, UsersRound } from "lucide-react";
import { Alert1 } from "@/shared/components/alert/Alert1/Alert1";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { LinkButton } from "@/shared/components/button/LinkButton/LinkButton";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider/ConfirmProvider";
import { EmptyState } from "@/shared/components/feedback/EmptyState/EmptyState";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { SearchInput } from "@/shared/components/input/SearchInput/SearchInput";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { secService } from "@/shared/services/secService";
import type { Pilote } from "@/shared/types";
import { PiloteCard } from "../../components/team/PiloteCard/PiloteCard";
import { PiloteModal } from "../../components/team/PiloteModal/PiloteModal";
import { usePilotes } from "../../hooks/usePilotes";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Option 1: the sécurisation admin creates and manages his pilots. */
export function SecPilotesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { pilotes, setPilotes, error, reload } = usePilotes();
  const [editing, setEditing] = useState<Pilote | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");

  const shown = useMemo(
    () => (pilotes ?? []).filter((p) => !q || norm(`${p.fullName ?? ""} ${p.username}`).includes(norm(q))),
    [pilotes, q],
  );
  const activeCount = pilotes?.filter((p) => p.active).length ?? 0;

  function upsert(p: Pilote) {
    setPilotes((list) => {
      const others = (list ?? []).filter((x) => x.id !== p.id);
      return [...others, p].sort((a, b) => Number(b.active) - Number(a.active) || (a.fullName || a.username).localeCompare(b.fullName || b.username));
    });
  }

  async function toggle(p: Pilote) {
    try {
      upsert(await secService.updatePilote(p.id, { fullName: p.fullName, active: !p.active }));
      toast.success(p.active ? "Pilote désactivé" : "Pilote réactivé", p.fullName || p.username);
    } catch (e) {
      toast.error("Modification impossible", e instanceof Error ? e.message : undefined);
    }
  }

  async function remove(p: Pilote) {
    const ok = await confirm({
      title: `Supprimer ${p.fullName || p.username} ?`,
      description:
        p.assigned > 0
          ? `Son compte est supprimé et ses ${p.assigned} dossier(s) repassent « non attribués » (les valeurs saisies sont conservées).`
          : "Son compte est supprimé définitivement.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await secService.deletePilote(p.id);
      setPilotes((list) => (list ?? []).filter((x) => x.id !== p.id));
      toast.success("Pilote supprimé");
    } catch (e) {
      toast.error("Suppression impossible", e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Équipe sécurisation"
        title="Pilotes"
        description="Créez les comptes de vos pilotes sécurisation, suivez leur charge et désactivez un pilote absent : il ne reçoit plus de dossiers au dispatch."
        icon={<UsersRound />}
        actions={
          <>
            <LinkButton href="/securisation/dispatch" variant="secondary" leftIcon={<Shuffle />}>
              Dispatcher
            </LinkButton>
            <Button1 leftIcon={<UserPlus />} onClick={() => setCreating(true)}>
              Nouveau pilote
            </Button1>
          </>
        }
      />

      {error && (
        <Alert1 tone="error" title="Chargement impossible" className="mb-4">
          {error}
        </Alert1>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Chercher un pilote…" className="w-full sm:w-72" />
        {pilotes && (
          <p className="font-mono text-[11px] tracking-wide text-slate-500">
            <span className="font-semibold text-slate-900">{activeCount}</span> actif(s) · {pilotes.length} au total
          </p>
        )}
      </div>

      {pilotes === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-60 rounded-3xl" />
          ))}
        </div>
      ) : pilotes.length === 0 ? (
        <EmptyState
          icon={<UsersRound />}
          title="Aucun pilote pour l'instant"
          description="Créez votre premier pilote : il pourra se connecter et recevoir sa part des dossiers."
          action={
            <Button1 leftIcon={<UserPlus />} onClick={() => setCreating(true)}>
              Créer un pilote
            </Button1>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <PiloteCard key={p.id} pilote={p} index={i} onEdit={() => setEditing(p)} onToggle={() => toggle(p)} onDelete={() => remove(p)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <PiloteModal
        open={creating || !!editing}
        pilote={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(p) => {
          setCreating(false);
          setEditing(null);
          upsert(p);
          reload();
        }}
      />
    </>
  );
}
