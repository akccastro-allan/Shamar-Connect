"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState("");
  const [recoveryRefreshToken, setRecoveryRefreshToken] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function allowPasswordReset() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
      }
      setReady(true);
    }

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashType = hashParams.get("type");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (hashType === "recovery" && accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message || "Link inválido ou expirado. Solicite uma nova recuperação de senha.");
          setReady(true);
          return;
        }

        window.history.replaceState(null, "", "/login/reset-password");
        setRecoveryAccessToken(accessToken);
        setRecoveryRefreshToken(refreshToken);
        setReady(true);
      });
      return;
    }

    if (tokenHash || type) {
      if (!tokenHash || type !== "recovery") {
        setError("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
        setReady(true);
        return;
      }

      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ data, error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message || "Link inválido ou expirado. Solicite uma nova recuperação de senha.");
          setReady(true);
          return;
        }

        setRecoveryAccessToken(data.session?.access_token || "");
        setReady(true);
      });
      return;
    }

    allowPasswordReset();
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const token = recoveryAccessToken || (await supabase.auth.getSession()).data.session?.access_token || "";
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, accessToken: token, refreshToken: recoveryRefreshToken }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setError(payload?.error || "Falha ao atualizar senha. Tente novamente.");
        return;
      }

      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => router.replace("/login"), 3000);
    } catch {
      setError("Falha ao atualizar senha. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F8FC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2ABFAB] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FC] px-5 py-10 text-slate-900 md:px-8">
      <section className="w-full max-w-[480px] rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 md:p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#132B57]">
            Shamar Connect
          </Link>
        </div>

        <div>
          <p className="text-center text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">
            Segurança
          </p>
          <h1 className="mt-3 text-center text-3xl font-black tracking-tight text-[#132B57]">
            Cadastre uma nova senha
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-slate-600">
            Escolha uma senha com no mínimo 8 caracteres para proteger sua conta.
          </p>
        </div>

        {done ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm font-semibold leading-6 text-emerald-700">
            Senha atualizada com sucesso. Você será redirecionado para o login.
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3.5 text-sm outline-none transition focus:border-[#2ABFAB] focus:bg-white focus:ring-4 focus:ring-[#2ABFAB]/12"
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Confirmar senha</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3.5 text-sm outline-none transition focus:border-[#2ABFAB] focus:bg-white focus:ring-4 focus:ring-[#2ABFAB]/12"
                placeholder="Repita a senha"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:bg-[#22A898] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        <div className="mt-7 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
          <p className="text-xs font-semibold leading-5 text-slate-500">
            Depois da alteração, sua sessão será encerrada e você precisará entrar novamente.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
