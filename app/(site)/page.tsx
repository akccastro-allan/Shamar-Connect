import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ShamarConnect — Pare de perder clientes por falta de organização",
  description: "Organize atendimentos em WhatsApp, Instagram e Facebook com equipe, histórico e responsáveis em uma central simples.",
};

export default async function HomePage() {
  const session = await getCurrentSession();
  const isAuthenticated = session !== null;

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-6xl px-5 py-24 text-center md:px-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">ShamarConnect</p>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-[#1B2F5B] md:text-6xl">
          Pare de perder clientes por falta de organização no atendimento.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          Transforme mensagens soltas em atendimentos organizados, com responsável, setor, histórico e próximo passo claro.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/contato" className="rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">
            Quero organizar meu atendimento
          </Link>
          <Link href={isAuthenticated ? "/operations" : "/login"} className="rounded-full border border-[#1B2F5B] px-8 py-4 font-black text-[#1B2F5B]">
            {isAuthenticated ? "Abrir plataforma" : "Entrar"}
          </Link>
        </div>
      </section>
    </main>
  );
}
