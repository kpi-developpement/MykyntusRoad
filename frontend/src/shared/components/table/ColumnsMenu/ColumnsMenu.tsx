"use client";

import { useMemo, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { ArrowDown, ArrowUp, Columns3, GripVertical, Lock, RotateCcw, Search, UserRound } from "lucide-react";
import { cn } from "../../../utils/cn";
import { stageTheme } from "../../../utils/sectionTheme";
import { Button1 } from "../../button/Button1/Button1";
import { Checkbox1 } from "../../checkbox/Checkbox1/Checkbox1";
import { Popover } from "../../popover/Popover/Popover";
import type { GridColumn, GridGroup } from "../DataGrid/types";

interface ColumnsMenuProps<T> {
  /** Every column, already in the order of the user (pinned first). */
  columns: GridColumn<T>[];
  groups?: GridGroup[];
  isVisible: (column: GridColumn<T>) => boolean;
  onToggle: (key: string, visible: boolean) => void;
  /** New order of the movable columns (keys). */
  onReorder: (keys: string[]) => void;
  onReset: () => void;
  /** The user changed the default arrangement. */
  customized?: boolean;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/**
 * "Mes colonnes": each profile chooses which columns it sees and in which order (drag the handle, or the
 * arrows / Alt + ↑ ↓ from the keyboard). The pinned columns (Date, ID Externe) always stay first.
 */
export function ColumnsMenu<T>({ columns, groups, isVisible, onToggle, onReorder, onReset, customized }: ColumnsMenuProps<T>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [q, setQ] = useState("");
  const pinned = columns.filter((c) => c.pinned);
  const movable = useMemo(() => columns.filter((c) => !c.pinned), [columns]);
  const keys = useMemo(() => movable.map((c) => c.key), [movable]);
  const byKey = useMemo(() => new Map(movable.map((c) => [c.key, c])), [movable]);
  const groupOf = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups]);
  const hiddenCount = movable.filter((c) => !isVisible(c)).length;
  const searching = q.trim().length > 0;
  const shown = searching
    ? movable.filter((c) => normalize(`${c.label} ${groupOf.get(c.groupId ?? "")?.title ?? ""}`).includes(normalize(q.trim())))
    : movable;

  const move = (key: string, delta: number) => {
    const i = keys.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= keys.length) return;
    const next = [...keys];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next);
  };

  const allVisible = hiddenCount === 0;

  return (
    <>
      <Button1
        variant="secondary"
        size="sm"
        leftIcon={<Columns3 />}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-expanded={!!anchor}
        className="h-10 rounded-xl"
      >
        Colonnes
        {hiddenCount > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 tabular-nums">{hiddenCount} masquées</span>}
        {customized && <span className="size-1.5 rounded-full bg-sky-500" title="Disposition personnalisée" />}
      </Button1>
      <Popover anchor={anchor} open={!!anchor} onClose={() => setAnchor(null)} align="end" width={360}>
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Mes colonnes</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
              <UserRound className="size-3" /> Propre à votre profil · glissez pour réordonner
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={!customized}
            className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 hover:text-brand-900 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <RotateCcw className="size-3" /> Par défaut
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chercher une colonne…"
              aria-label="Chercher une colonne"
              className="h-8 w-full rounded-lg bg-slate-50 pr-2 pl-7 text-sm ring-1 ring-slate-200 ring-inset placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => movable.forEach((c) => onToggle(c.key, !allVisible))}
            className="h-8 shrink-0 rounded-lg px-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {allVisible ? "Tout masquer" : "Tout afficher"}
          </button>
        </div>

        <div className="scroll-thin max-h-[58vh] overflow-y-auto px-1.5 pb-2">
          {!searching && pinned.length > 0 && (
            <ul className="mb-1 border-b border-dashed border-slate-200 pb-1">
              {pinned.map((c) => (
                <li key={c.key} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-400" title="Toujours affichée, à gauche">
                  <Lock className="size-3.5 shrink-0" />
                  <span className="truncate">{c.label}</span>
                  <span className="ml-auto font-mono text-[9px] tracking-wider uppercase">fixe</span>
                </li>
              ))}
            </ul>
          )}
          {searching ? (
            <ul>
              {shown.map((c) => (
                <ColumnRow key={c.key} column={c} group={groupOf.get(c.groupId ?? "")} visible={isVisible(c)} onToggle={onToggle} />
              ))}
              {shown.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">Aucune colonne trouvée</li>}
            </ul>
          ) : (
            <Reorder.Group axis="y" values={keys} onReorder={onReorder} as="ul" layoutScroll className="relative">
              {keys.map((key, i) => {
                const c = byKey.get(key);
                if (!c) return null;
                return (
                  <DraggableRow
                    key={key}
                    column={c}
                    group={groupOf.get(c.groupId ?? "")}
                    visible={isVisible(c)}
                    onToggle={onToggle}
                    onMove={(delta) => move(key, delta)}
                    first={i === 0}
                    last={i === keys.length - 1}
                  />
                );
              })}
            </Reorder.Group>
          )}
        </div>
      </Popover>
    </>
  );
}

interface RowProps<T> {
  column: GridColumn<T>;
  group?: GridGroup;
  visible: boolean;
  onToggle: (key: string, visible: boolean) => void;
}

function GroupTag({ group }: { group?: GridGroup }) {
  if (!group) return null;
  return (
    <span className="ml-auto inline-flex max-w-28 shrink-0 items-center gap-1 truncate font-mono text-[9px] tracking-wide text-slate-400 uppercase">
      <span className={cn("size-1.5 shrink-0 rounded-full", stageTheme(group.id).solid)} />
      <span className="truncate">{group.title}</span>
    </span>
  );
}

function ColumnRow<T>({ column, group, visible, onToggle }: RowProps<T>) {
  return (
    <li>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={visible}
        onClick={() => onToggle(column.key, !visible)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
      >
        <Checkbox1 checked={visible} />
        <span className={cn("truncate", !visible && "text-slate-400")}>{column.label}</span>
        <GroupTag group={group} />
      </button>
    </li>
  );
}

function DraggableRow<T>({
  column,
  group,
  visible,
  onToggle,
  onMove,
  first,
  last,
}: RowProps<T> & { onMove: (delta: number) => void; first: boolean; last: boolean }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={column.key}
      dragListener={false}
      dragControls={controls}
      as="li"
      className="group/col relative flex items-center gap-1.5 rounded-lg bg-white pr-1 pl-1 text-sm text-slate-700 hover:bg-slate-50"
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px -12px rgb(15 23 42 / 0.35)", zIndex: 10 }}
      transition={{ type: "spring", stiffness: 600, damping: 40 }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!e.altKey) return;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onMove(-1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onMove(1);
        }
      }}
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
        aria-hidden
      >
        <GripVertical className="size-4" />
      </span>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={visible}
        onClick={() => onToggle(column.key, !visible)}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 text-left"
        title="Alt + ↑ / ↓ pour déplacer"
      >
        <Checkbox1 checked={visible} />
        <span className={cn("truncate", !visible && "text-slate-400")}>{column.label}</span>
        <GroupTag group={group} />
      </button>
      <span className="flex shrink-0 opacity-0 transition-opacity group-focus-within/col:opacity-100 group-hover/col:opacity-100">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={first}
          aria-label={`Monter ${column.label}`}
          className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={last}
          aria-label={`Descendre ${column.label}`}
          className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
        >
          <ArrowDown className="size-3.5" />
        </button>
      </span>
    </Reorder.Item>
  );
}
