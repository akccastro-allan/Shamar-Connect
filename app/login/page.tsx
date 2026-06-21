"use client";

import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

function getNextPath() {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [forgotError, setForgotError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: getNextPath() }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error || "Não foi possível entrar. Confira e-mail e senha.");
        return;
      }

      window.location.assign(payload.next || getNextPath());
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotError("");
    setForgotStatus("sending");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setForgotError(payload?.error || "Falha ao enviar. Tente novamente.");
        setForgotStatus("idle");
        return;
      }

      setForgotStatus("sent");
    } catch {
      setForgotError("Falha de conexão. Tente novamente.");
      setForgotStatus("idle");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-8 max-w-xs">
          <BrandLogo className="h-auto w-full" />
        </div>

        {!showForgot ? (
          <>
            <h1 className="text-center text-2xl font-bold text-[#1B2F5B]">
              Entrar no ShamarConnect
            </h1>

            <p className="mt-2 text-center text-sm text-slate-500">
              Acesse sua conta para gerenciar atendimentos, vendas e automações.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">E-mail</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                  placeholder="seu@email.com"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Senha</span>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                    className="text-xs text-[#2ABFAB] hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                  placeholder="Digite sua senha"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-xl bg-[#2ABFAB] px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {/* Login com Google — oculto até a liberação do OAuth.
                Restaurar este bloco quando o provedor for aprovado. */}
            {/*
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <a
              href="/api/auth/oauth?provider=google"
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Entrar com Google
            </a>
            */}

            <p className="mt-6 text-center text-xs text-slate-400">
              O acesso é liberado apenas para usuários vinculados a uma empresa ativa.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold text-[#1B2F5B]">
              Recuperar senha
            </h1>

            <p className="mt-2 text-center text-sm text-slate-500">
              Enviaremos um link para você cadastrar uma nova senha.
            </p>

            {forgotStatus === "sent" ? (
              <div className="mt-8 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center text-sm text-green-700">
                E-mail enviado! Verifique sua caixa de entrada e clique no link recebido.
              </div>
            ) : (
              <form className="mt-8 space-y-4" onSubmit={handleForgot}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                    placeholder="seu@email.com"
                  />
                </label>

                {forgotError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {forgotError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={forgotStatus === "sending"}
                  className="flex w-full justify-center rounded-xl bg-[#2ABFAB] px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {forgotStatus === "sending" ? "Enviando..." : "Enviar link de recuperação"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotStatus("idle"); setForgotError(""); }}
                className="text-sm text-slate-500 hover:text-[#1B2F5B]"
              >
                ← Voltar ao login
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
