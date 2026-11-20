"use client";

import { useState } from "react";
import { Dices, Eye, EyeOff, KeyRound, UserPlus, UserRoundPen } from "lucide-react";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Input1 } from "@/shared/components/input/Input1/Input1";
import { Modal1 } from "@/shared/components/modal/Modal1/Modal1";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import { useToast } from "@/shared/components/toast/ToastProvider/ToastProvider";
import { secService } from "@/shared/services/secService";
import type { Pilote } from "@/shared/types";

interface PiloteModalProps {
  open: boolean;
  /** null = creation. */
  pilote: Pilote | null;
  onClose: () => void;
  onSaved: (pilote: Pilote) => void;
}

function randomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

/** "Prénom Nom" -> "prenom.nom". */
function suggestUsername(fullName: string): string {
  return fullName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

/** Creates a sécurisation pilot, or edits one (name, password, active). */
export function PiloteModal({ open, pilote, onClose, onSaved }: PiloteModalProps) {
  return (
    <Modal1
      open={open}
      onClose={onClose}
      size="sm"
      icon={pilote ? <UserRoundPen /> : <UserPlus />}
      title={pilote ? "Modifier le pilote" : "Nouveau pilote sécurisation"}
      description={pilote ? `@${pilote.username}` : "Il pourra se connecter tout de suite et recevoir des dossiers."}
    >
      {open && <PiloteForm key={pilote?.id ?? "new"} pilote={pilote} onClose={onClose} onSaved={onSaved} />}
    </Modal1>
  );
}

function PiloteForm({ pilote, onClose, onSaved }: Omit<PiloteModalProps, "open">) {
  const toast = useToast();
  const [fullName, setFullName] = useState(pilote?.fullName ?? "");
  const [username, setUsername] = useState(pilote?.username ?? "");
  const [touchedUsername, setTouchedUsername] = useState(!!pilote);
  const [password, setPassword] = useState(pilote ? "" : randomPassword());
  const [show, setShow] = useState(!pilote);
  const [active, setActive] = useState(pilote?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const passwordError = password && password.length < 6 ? "6 caractères minimum" : undefined;
  const canSave = (pilote || (username.trim().length >= 2 && password.length >= 6)) && !passwordError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const saved = pilote
        ? await secService.updatePilote(pilote.id, { fullName: fullName.trim() || null, active, password: password || undefined })
        : await secService.createPilote({ username: username.trim(), password, fullName: fullName.trim() || undefined });
      toast.success(pilote ? "Pilote mis à jour" : "Pilote créé", pilote ? undefined : `Identifiant : ${saved.username}`);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input1
        label="Nom complet"
        value={fullName}
        autoFocus
        placeholder="Prénom Nom"
        onChange={(e) => {
          setFullName(e.target.value);
          if (!touchedUsername) setUsername(suggestUsername(e.target.value));
        }}
      />
      {!pilote && (
        <Input1
          label="Identifiant de connexion"
          value={username}
          placeholder="prenom.nom"
          hint="Lettres, chiffres, . _ - @"
          onChange={(e) => {
            setTouchedUsername(true);
            setUsername(e.target.value.replace(/\s/g, ""));
          }}
        />
      )}
      <Input1
        label={pilote ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
        type={show ? "text" : "password"}
        value={password}
        error={passwordError}
        leftIcon={<KeyRound />}
        inputClassName="font-mono"
        placeholder={pilote ? "Laisser vide pour ne pas changer" : ""}
        onChange={(e) => setPassword(e.target.value)}
        rightSlot={
          <span className="flex items-center gap-0.5 pr-1">
            <button type="button" title="Générer" onClick={() => (setPassword(randomPassword()), setShow(true))} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600">
              <Dices className="size-4" />
            </button>
            <button type="button" title={show ? "Masquer" : "Afficher"} onClick={() => setShow(!show)} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        }
      />
      {pilote && <Switch1 checked={active} onChange={setActive} label={active ? "Compte actif" : "Compte désactivé (ne reçoit plus de dossiers)"} />}
      {error && <p className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button1 type="button" variant="ghost" onClick={onClose}>
          Annuler
        </Button1>
        <Button1 type="submit" loading={saving} disabled={!canSave}>
          {pilote ? "Enregistrer" : "Créer le pilote"}
        </Button1>
      </div>
    </form>
  );
}
