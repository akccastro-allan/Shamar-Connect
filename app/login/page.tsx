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
