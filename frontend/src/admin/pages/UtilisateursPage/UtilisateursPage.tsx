"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { UserPlus, Users } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Card1 } from "@/shared/components/card/Card1/Card1";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider/ConfirmProvider";
import { Skeleton } from "@/shared/components/feedback/Skeleton/Skeleton";
import { PageHeader } from "@/shared/components/layout/PageHeader/PageHeader";
import { AnimatedNumber } from "@/shared/components/motion/AnimatedNumber/AnimatedNumber";
import { Surface } from "@/shared/components/surface/Surface/Surface";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { useAuth } from "@/shared/context/AuthContext";
import { userService } from "@/shared/services/userService";
import type { Role, User } from "@/shared/types";
import { UserCreateModal } from "../../components/modal/UserCreateModal/UserCreateModal";
import { PasswordModal } from "../../components/modal/PasswordModal/PasswordModal";
import { UsersTable } from "../../components/table/UsersTable/UsersTable";
import { ROLE_INFO, ROLES } from "../../roles";

export function UtilisateursPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<User | null>(null);

  const load = useCallback(() => {
    userService
      .list()
      .then(setUsers)
      .catch((e: Error) => toast.error("Chargement impossible", e.message));
  }, [toast]);

  useEffect(load, [load]);

  const onError = useCallback((message: string) => toast.error("Action impossible", message), [toast]);

  async function update(u: User, patch: Partial<{ role: Role; active: boolean }>) {
    try {
      await userService.update(u.id, { fullName: u.fullName ?? undefined, role: patch.role ?? u.role, active: patch.active ?? u.active });
      toast.success("Utilisateur mis à jour", u.fullName || u.username);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function remove(u: User) {
    const ok = await confirm({
      title: `Supprimer ${u.fullName || u.username} ?`,
      description: "Le compte sera supprimé définitivement. Pour bloquer l'accès sans supprimer, désactivez-le.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    try {
      await userService.remove(u.id);
      toast.success("Utilisateur supprimé", u.username);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        description="Gérez les comptes et leurs rôles. Le rôle détermine les sections du tableau que chacun peut modifier."
        icon={<Users />}
        actions={
          <Button1 leftIcon={<UserPlus />} onClick={() => setCreating(true)}>
            Nouvel utilisateur
          </Button1>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((role, i) => {
          const info = ROLE_INFO[role];
          return (
            <motion.div key={role} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}>
              <Surface spotlight corners interactive className="group flex items-center gap-4 rounded-3xl p-5">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_24px_-10px_rgb(15_23_42/0.55)] transition-transform duration-500 ease-out-expo group-hover:rotate-[-6deg] ${info.iconClass}`}
                >
                  <info.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-3xl leading-none font-semibold tracking-tight text-slate-950">
                    <AnimatedNumber value={users?.filter((u) => u.role === role).length ?? 0} />
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase">{info.label}</p>
                </div>
              </Surface>
            </motion.div>
          );
        })}
      </div>

      <Card1 title="Comptes" subtitle={users ? `${users.length} utilisateur(s)` : "Chargement…"} icon={<Users />} bodyClassName="p-0">
        {users === null ? (
          <div className="space-y-4 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="ml-auto h-8 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <UsersTable users={users} currentUsername={user?.username ?? ""} onUpdate={update} onPassword={setPasswordFor} onDelete={remove} />
        )}
      </Card1>

      <UserCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(username) => {
          toast.success("Utilisateur créé", username);
          load();
        }}
        onError={onError}
      />
      <PasswordModal user={passwordFor} onClose={() => setPasswordFor(null)} onDone={(username) => toast.success("Mot de passe modifié", username)} onError={onError} />
    </>
  );
}
