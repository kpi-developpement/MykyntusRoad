"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { TriangleAlert, CircleHelp } from "lucide-react";
import { Button1 } from "../../button/Button1/Button1";
import { Modal1 } from "../../modal/Modal1/Modal1";
import { cn } from "../../../utils/cn";

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Replaces window.confirm() with an animated dialog: `if (await confirm({...})) ...` */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise<boolean>((resolve) => setState({ options, resolve })),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok);
      setState(null);
    },
    [state],
  );

  const danger = state?.options.tone !== "primary";
  const Icon = danger ? TriangleAlert : CircleHelp;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal1
        open={!!state}
        onClose={() => close(false)}
        size="sm"
        icon={
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", danger ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600")}>
            <Icon className="size-5" />
          </span>
        }
        title={state?.options.title}
        description={state?.options.description}
        footer={
          <>
            <Button1 variant="secondary" onClick={() => close(false)}>
              {state?.options.cancelLabel ?? "Annuler"}
            </Button1>
            <Button1 variant={danger ? "dangerSolid" : "primary"} onClick={() => close(true)} autoFocus>
              {state?.options.confirmLabel ?? "Confirmer"}
            </Button1>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
