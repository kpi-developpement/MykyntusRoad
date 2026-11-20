"use client";

import { motion } from "motion/react";
import { KeyRound, Trash2 } from "lucide-react";
import { Avatar1 } from "@/shared/components/avatar/Avatar1/Avatar1";
import { Badge1 } from "@/shared/components/badge/Badge1/Badge1";
import { IconButton } from "@/shared/components/button/IconButton/IconButton";
import { Select1 } from "@/shared/components/select/Select1/Select1";
import { Switch1 } from "@/shared/components/switch/Switch1/Switch1";
import type { Role, User } from "@/shared/types";
import { ROLE_INFO, ROLES } from "../../../roles";

interface UsersTableProps {
  users: User[];
  currentUsername: string;
  onUpdate: (user: User, patch: Partial<{ role: Role; active: boolean }>) => void;
  onPassword: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({ users, currentUsername, onUpdate, onPassword, onDelete }: UsersTableProps) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
            <th className="px-5 py-3">Utilisateur</th>
            <th className="px-5 py-3">Rôle</th>
            <th className="px-5 py-3">Statut</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => {
            const self = u.username === currentUsername;
            const name = u.fullName || u.username;
            const info = ROLE_INFO[u.role];
            return (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group border-t border-slate-100 transition-colors hover:bg-row-hover"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar1 name={name} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="truncate">{name}</span>
                        {self && <Badge1 tone="slate">Vous</Badge1>}
                      </p>
                      <p className="truncate text-xs text-slate-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${info.iconClass}`}>
                      <info.icon className="size-4" />
                    </span>
                    <Select1
                      size="sm"
                      value={u.role}
                      disabled={self}
                      onChange={(e) => onUpdate(u, { role: e.target.value as Role })}
                      options={ROLES.map((r) => ({ value: r, label: ROLE_INFO[r].label }))}
                      className="w-48"
                      aria-label={`Rôle de ${name}`}
                    />
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Switch1 checked={u.active} disabled={self} onChange={(active) => onUpdate(u, { active })} label={u.active ? "Actif" : "Inactif"} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <IconButton label="Changer le mot de passe" onClick={() => onPassword(u)} tooltipSide="left">
                      <KeyRound />
                    </IconButton>
                    <IconButton
                      label={self ? "Impossible de supprimer votre compte" : "Supprimer"}
                      disabled={self}
                      onClick={() => onDelete(u)}
                      tooltipSide="left"
                      className="hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 />
                    </IconButton>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
