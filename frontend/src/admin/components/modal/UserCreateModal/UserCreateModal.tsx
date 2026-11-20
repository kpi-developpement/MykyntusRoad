"use client";

import { useState } from "react";
import { AtSign, Eye, EyeOff, KeyRound, UserPlus, UserRound } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Input1 } from "@/shared/components/input/Input1/Input1";
import { Modal1 } from "@/shared/components/modal/Modal1/Modal1";
import { userService } from "@/shared/services/userService";
import type { Role } from "@/shared/types";
import { RolePicker } from "../../form/RolePicker/RolePicker";

interface UserCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (username: string) => void;
  onError: (message: string) => void;
}

export function UserCreateModal({ open, onClose, onCreated, onError }: UserCreateModalProps) {
  return (
    <Modal1
      open={open}
      onClose={onClose}
      size="md"
      icon={
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <UserPlus className="size-5" />
        </span>
      }
      title="Nouvel utilisateur"
      description="Le rôle détermine les sections modifiables."
    >
      {open && <CreateForm onClose={onClose} onCreated={onCreated} onError={onError} />}
    </Modal1>
  );
}

function CreateForm({ onClose, onCreated, onError }: Omit<UserCreateModalProps, "open">) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("PILOTE_SECURISATION");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await userService.create({ username: username.trim(), password, fullName: fullName.trim(), role });
      onCreated(user.username);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input1 label="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} leftIcon={<AtSign />} required autoFocus autoComplete="off" />
        <Input1 label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} leftIcon={<UserRound />} placeholder="Prénom Nom" />
      </div>
      <Input1
        label="Mot de passe"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<KeyRound />}
        required
        minLength={6}
        autoComplete="new-password"
        hint="6 caractères minimum."
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPassword ? "Masquer" : "Afficher"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-600">Rôle</span>
        <RolePicker value={role} onChange={setRole} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button1 variant="secondary" onClick={onClose}>
          Annuler
        </Button1>
        <Button1 type="submit" loading={busy} disabled={!username.trim() || password.length < 6}>
          Créer l&apos;utilisateur
        </Button1>
      </div>
    </form>
  );
}
