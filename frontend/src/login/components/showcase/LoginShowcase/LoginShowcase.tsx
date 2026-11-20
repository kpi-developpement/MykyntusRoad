"use client";

import { motion } from "motion/react";
import { CloudUpload, ListFilter, ShieldCheck } from "lucide-react";
import { ValueChip } from "@/shared/components/badge/ValueChip/ValueChip";
import { LiveDot } from "@/shared/components/feedback/LiveDot/LiveDot";
import { BrandMark } from "@/shared/components/layout/BrandMark/BrandMark";
import { RevealText } from "@/shared/components/text/RevealText/RevealText";
import { ScrambleText } from "@/shared/components/text/ScrambleText/ScrambleText";

const FEATURES = [
  { icon: CloudUpload, title: "Import intelligent", text: "Colonnes détectées automatiquement, quel que soit le fichier." },
  { icon: ShieldCheck, title: "Sécurisation J-1", text: "Planification et sécurisation des dossiers la veille." },
  { icon: ListFilter, title: "Suivi J / J+1", text: "Filtres sur chaque colonne, saisie en un clic." },
];

const PREVIEW = [
  { id: "EPS-0022050200", values: ["Planifié", "Dossier sécurisé"] },
  { id: "EPS-0022089644", values: ["Ouvert", "Client injoignable"] },
  { id: "EPS-0022113001", values: ["Planifié", "Oui"] },
];

/**
 * Left side of the login screen: brand, features, live-looking preview and a moving
 * perspective grid. Glows are radial gradients (no blur filter); the grid moves with transform only.
 */
export function LoginShowcase() {
  return (
    <div className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#060a26_0%,#0d1656_45%,#1a2a9c_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden className="pointer-events-none absolute -top-48 -left-48 size-[40rem] bg-[radial-gradient(circle,rgb(59_102_245/0.55),transparent_60%)]" />
      <div aria-hidden className="pointer-events-none absolute right-[-14rem] bottom-[-12rem] size-[42rem] bg-[radial-gradient(circle,rgb(56_189_248/0.28),transparent_60%)]" />
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />

      {/* perspective floor */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[-25%] bottom-0 h-[42%] overflow-hidden [perspective:380px] [mask-image:linear-gradient(to_top,black_5%,transparent_85%)]">
        <div className="absolute inset-0 origin-bottom [transform:rotateX(64deg)]">
          <div className="grid-lines absolute inset-x-0 -top-12 bottom-0 animate-grid-flow opacity-90 will-change-transform [background-size:48px_48px]" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative flex items-center gap-3">
        <BrandMark variant="light" />
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">MyKyntus</p>
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-sky-300/85 uppercase">
            <LiveDot tone="neon" className="size-1.5" /> Système en ligne
          </p>
        </div>
      </motion.div>

      <div className="relative max-w-lg">
        <p className="mb-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.26em] text-sky-300 uppercase">
          <span className="h-px w-8 bg-linear-to-r from-sky-300 to-transparent" />
          <ScrambleText text="Plateforme de pilotage" duration={900} />
        </p>
        <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight xl:text-[52px]">
          <RevealText text="Pilotez vos dossiers," delay={0.15} />
          <br />
          <RevealText text="de J-1 à J+1." delay={0.4} className="text-sky-300" />
        </h1>
        <ul className="mt-9 space-y-4">
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] ring-1 ring-white/15">
                <f.icon className="size-5 text-sky-300" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="block text-sm text-brand-200/90">{f.text}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <div className="animate-float-slow rounded-3xl bg-linear-to-br from-sky-300/50 via-white/10 to-brand-400/40 p-px shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
            <div className="rounded-[23px] bg-[linear-gradient(160deg,rgb(18_27_94/0.92),rgb(10_16_60/0.92))] p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] tracking-[0.2em] text-sky-200 uppercase">Suivi · demain</span>
                <span className="flex gap-1">
                  <span className="size-2 rounded-full bg-white/25" />
                  <span className="size-2 rounded-full bg-white/25" />
                  <span className="size-2 rounded-full bg-sky-300 shadow-[0_0_8px_#7dd3fc]" />
                </span>
              </div>
              <div className="space-y-2">
                {PREVIEW.map((row, i) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.12 }}
                    className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-slate-800 shadow-sm"
                  >
                    <span className="font-mono text-xs font-semibold text-brand-700">{row.id}</span>
                    <span className="ml-auto flex gap-1.5">
                      {row.values.map((v) => (
                        <ValueChip key={v} value={v} size="xs" />
                      ))}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="relative font-mono text-[10px] tracking-[0.2em] text-brand-300 uppercase">© MyKyntus · J-1 / J / J+1</p>
    </div>
  );
}
