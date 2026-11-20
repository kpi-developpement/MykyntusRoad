"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { Alert1 } from "@/shared/components/alert/Alert1/Alert1";
import { Button1 } from "@/shared/components/button/Button1/Button1";
import { Input1 } from "@/shared/components/input/Input1/Input1";
import { BrandMark } from "@/shared/components/layout/BrandMark/BrandMark";
import { RevealText } from "@/shared/components/text/RevealText/RevealText";
import { ScrambleText } from "@/shared/components/text/ScrambleText/ScrambleText";
import { homeFor, useAuth } from "@/shared/context/AuthContext";
import { LoginShowcase } from "../../components/showcase/LoginShowcase/LoginShowcase";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ message: string; id: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [user, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(username.trim(), password);
      router.replace(homeFor(u.role));
    } catch (err) {
      setError((prev) => ({ message: err instanceof Error ? err.message : "Connexion impossible", id: (prev?.id ?? 0) + 1 }));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <LoginShowcase />

      <div className="app-canvas relative flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-slate-900">MyKyntus</p>
              <p className="font-mono text-[10px] tracking-[0.18em] text-slate-500 uppercase">Suivi des dossiers</p>
            </div>
          </div>

          {/* rotating light around the card: one composited layer, transform only */}
          <div className="relative overflow-hidden rounded-[30px] p-[1.5px] shadow-[0_30px_80px_-30px_rgb(30_47_174/0.5)]">
            <div
              aria-hidden
              className="absolute inset-[-60%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,rgb(56_189_248)_50deg,rgb(37_72_234)_110deg,transparent_170deg,transparent_360deg)] will-change-transform"
            />
            <form onSubmit={submit} className="relative isolate rounded-[28.5px] bg-white p-8 sm:p-10">
              <span aria-hidden className="hud-corners" />
              <p className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.24em] text-brand-600 uppercase">
                <span className="h-px w-6 bg-linear-to-r from-brand-600 to-sky-400" />
                <ScrambleText text="Espace sécurisé" />
              </p>
              <h2 className="mt-2 font-display text-[30px] leading-tight font-semibold tracking-tight text-slate-950">
                <RevealText text="Connexion" delay={0.1} />
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">Entrez vos identifiants pour accéder à vos dossiers.</p>

              <div className="mt-7 space-y-4">
                {error && (
                  <div key={error.id} className="animate-shake">
                    <Alert1 tone="error">{error.message}</Alert1>
                  </div>
                )}
                <Input1
                  label="Identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<UserRound />}
                  autoComplete="username"
                  required
                  autoFocus
                  inputClassName="h-11"
                />
                <Input1
                  label="Mot de passe"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<LockKeyhole />}
                  autoComplete="current-password"
                  required
                  inputClassName="h-11"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </div>

              <Button1
                type="submit"
                size="lg"
                loading={busy}
                className="mt-7 w-full"
                rightIcon={!busy && <ArrowRight className="transition-transform duration-300 group-hover/btn:translate-x-1" />}
              >
                Se connecter
              </Button1>
            </form>
          </div>

          <p className="mt-6 text-center font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase">MyKyntus · Suivi des dossiers J-1 / J / J+1</p>
        </motion.div>
      </div>
    </div>
  );
}
