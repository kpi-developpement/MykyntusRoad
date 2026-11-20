"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Input1 } from "@/shared/components/input/Input1/Input1";
import { Modal1 } from "@/shared/components/modal/Modal1/Modal1";
import { userService } from "@/shared/services/userService";
import type { User } from "@/shared/types";

interface PasswordModalProps {
  user: User | null;
  onClose: () => void;
  onDone: (username: string) => void;
  onError: (message: string) => void;
}

/** Reset the password of a user. */
export function PasswordModal({ user, onClose, onDone, onError }: PasswordModalProps) {
  return (
    <Modal1
      open={!!user}
      onClose={onClose}
      size="sm"
      icon={
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <KeyRound className="size-5" />
        </span>
      }
      title="Nouveau mot de passe"
      description={user ? `Pour ${user.fullName || user.username}` : undefined}
    >
      {user && <PasswordForm user={user} onClose={onClose} onDone={onDone} onError={onError} />}
    </Modal1>
  );
}

function PasswordForm({ user, onClose, onDone, onError }: Omit<PasswordModalProps, "user"> & { user: User }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirmation.length > 0 && confirmation !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6 || mismatch) return;
    setBusy(true);
    try {
      await userService.update(user.id, { fullName: user.fullName ?? undefined, role: user.role, active: user.active, password });
      onDone(user.username);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-2">
      <Input1 label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="new-password" hint="6 caractères minimum." />
      <Input1
        label="Confirmation"
        type="password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        autoComplete="new-password"
        error={mismatch ? "Les mots de passe ne correspondent pas" : undefined}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button1 variant="secondary" onClick={onClose}>
          Annuler
        </Button1>
        <Button1 type="submit" loading={busy} disabled={password.length < 6 || confirmation !== password}>
          Enregistrer
        </Button1>
      </div>
    </form>
  );
}
