"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

function getNextPath() {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

function AccessVisual() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-[#0B1220] p-10 text-white lg:flex lg:w-[52%] lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(42,191,171,0.24),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.10),transparent_30%)]" />
      <div className="absolute -right-24 bottom-16 h-72 w-72 rotate-12 rounded-[3rem] bg-white/5" />
      <div className="absolute right-24 top-28 h-52 w-52 rotate-12 rounded-[2.5rem] bg-[#2ABFAB]/10" />

      <div className="relative">
        <Link href="/" className="text-2xl font-black tracking-tight text-white">
          Shamar Connect
        </Link>

        <div className="mt-20 max-w-2xl">
          <p className="inline-flex rounded-full bg-white/8 px-4 py-2 text-sm font-black text-[#86F2E2] ring-1 ring-white/10">
            Plataforma segura
          </p>
          <h1 className="mt-7 text-5xl font-black leading-[1.03] tracking-tight">
            Acesse sua central de atendimento com segurança.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
            Gerencie conversas, equipe, histórico, vendas e próximos passos em um ambiente organizado para sua operação.
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="rounded-[2rem] bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur">
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-2xl shadow-black/25">
            <div className="border-b border-slate-100 bg-[#F7F9FC] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#13796D]">Shamar Connect</p>
              <p className="mt-1 text-sm font-black text-[#132B57]">Operação protegida</p>
            </div>

            <div className="grid gap-3 p-5">
              {[
                ["Sessão segura", "Acesso com credenciais autorizadas"],
                ["Empresa ativa", "Usuário vinculado ao tenant correto"],
                ["Controle de equipe", "Permissões e responsáveis por operação"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                  <p className="text-sm font-black text-[#132B57]">{title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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
    <main className="min-h-screen bg-[#F6F8FC] text-slate-900 lg:flex">
      <AccessVisual />

      <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-10 md:px-8">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="text-2xl font-black tracking-tight text-[#132B57]">
              Shamar Connect
            </Link>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 md:p-8">
            {!showForgot ? (
              <>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Acesso</p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-[#132B57]">
                    Entre na sua central
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Acesse sua conta para gerenciar atendimentos, vendas, histórico e equipe.
                  </p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">E-mail</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3.5 text-sm outline-none transition focus:border-[#2ABFAB] focus:bg-white focus:ring-4 focus:ring-[#2ABFAB]/12"
                      placeholder="seu@email.com"
                    />
                  </label>

                  <label className="block">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-700">Senha</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgot(true);
                          setForgotEmail(email);
                        }}
                        className="text-xs font-black text-[#13796D] hover:underline"
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
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3.5 text-sm outline-none transition focus:border-[#2ABFAB] focus:bg-white focus:ring-4 focus:ring-[#2ABFAB]/12"
                      placeholder="Digite sua senha"
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
                    {isSubmitting ? "Entrando..." : "Entrar"}
                  </button>
                </form>

                <div className="mt-7 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                  <p className="text-xs font-semibold leading-5 text-slate-500">
                    O acesso é liberado apenas para usuários vinculados a uma empresa ativa.
                  </p>
                </div>

                <div className="mt-6 flex justify-center gap-4 text-sm font-bold">
                  <Link href="/planos" className="text-[#132B57] hover:text-[#13796D]">
                    Ver planos
                  </Link>
                  <Link href="/contato" className="text-slate-500 hover:text-[#132B57]">
                    Falar com suporte
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Segurança</p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-[#132B57]">
                    Recuperar senha
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Enviaremos um link seguro para você cadastrar uma nova senha.
                  </p>
                </div>

                {forgotStatus === "sent" ? (
                  <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold leading-6 text-emerald-700">
                    E-mail enviado. Verifique sua caixa de entrada e clique no link recebido.
                  </div>
                ) : (
                  <form className="mt-8 space-y-5" onSubmit={handleForgot}>
                    <label className="block">
                      <span className="text-sm font-bold text-slate-700">E-mail</span>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3.5 text-sm outline-none transition focus:border-[#2ABFAB] focus:bg-white focus:ring-4 focus:ring-[#2ABFAB]/12"
                        placeholder="seu@email.com"
                      />
                    </label>

                    {forgotError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {forgotError}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={forgotStatus === "sending"}
                      className="flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:bg-[#22A898] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {forgotStatus === "sending" ? "Enviando..." : "Enviar link de recuperação"}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotStatus("idle");
                    setForgotError("");
                  }}
                  className="mt-6 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#132B57] transition hover:bg-[#F8FAFC]"
                >
                  Voltar ao login
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
