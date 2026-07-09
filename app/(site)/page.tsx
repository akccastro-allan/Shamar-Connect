import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";

import { RecoveryHashRedirect } from "@/components/auth/recovery-hash-redirect";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Shamar Connect — Atendimento, CRM e vendas no WhatsApp",
  description:
    "Centralize conversas, responsáveis, histórico, setores e próximos passos em uma central profissional para atendimento e vendas pelo WhatsApp.",
  openGraph: {
    title: "Shamar Connect — Atendimento, CRM e vendas no WhatsApp",
    description:
      "Organize a operação comercial e o atendimento com histórico, responsáveis e próximos passos claros.",
    url: "https://shamarconnect.com.br",
    type: "website",
  },
};

const quickBenefits = [
  "Responsável por conversa",
  "Histórico do cliente",
  "Setores e filas",
  "Próxima ação visível",
];

const operationCards = [
  {
    icon: MessageSquareText,
    title: "Atendimento centralizado",
    text: "Converse com clientes sem perder contexto, histórico ou responsável.",
  },
  {
    icon: UserRound,
    title: "Equipe organizada",
    text: "Defina setores, responsáveis e status para cada atendimento.",
  },
  {
    icon: Clock,
    title: "Retorno no tempo certo",
    text: "Controle orçamentos, pendências, follow-up e pós-venda.",
  },
  {
    icon: ShieldCheck,
    title: "Humano no controle",
    text: "Sem robô solto. O processo apoia sua equipe, não substitui sua operação.",
  },
];

const workflow = [
  "Cliente chama pelo WhatsApp",
  "Equipe assume com responsável e setor",
  "Histórico e notas ficam salvos",
  "Atendimento vira orçamento, retorno ou venda",
];

const segments = [
  "Oficinas e autopeças",
  "Clínicas",
  "E-commerce",
  "Prestadores de serviço",
  "Igrejas e eventos",
  "Empresas com várias marcas",
];

const plans = [
  {
    name: "Essencial",
    price: "R$149",
    setup: "Implantação R$297",
    text: "Para começar organizado.",
    href: "/checkout?plan=starter",
  },
  {
    name: "Professional",
    price: "R$297",
    setup: "Implantação R$497",
    text: "Para equipes com atendimento e vendas.",
    href: "/checkout?plan=professional",
    featured: true,
  },
  {
    name: "Business",
    price: "R$597",
    setup: "Implantação R$997",
    text: "Para operações com mais canais e integrações.",
    href: "/checkout?plan=business",
  },
];

function CheckMark() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ABFAB]/15 text-[#13796D]">
      <CheckCircle2 className="h-3.5 w-3.5" />
    </span>
  );
}

function HeroProductVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[590px]">
      <div className="absolute -right-6 top-8 hidden rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/20 md:block">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Novo cliente</p>
        <p className="mt-1 text-sm font-black text-[#132B57]">Orçamento pendente</p>
      </div>

      <div className="absolute -left-5 bottom-16 hidden rounded-2xl bg-white px-4 py-3 shadow-2xl shadow-black/20 lg:block">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Responsável</p>
        <p className="mt-1 text-sm font-black text-[#132B57]">Ana · Vendas</p>
      </div>

      <div className="rounded-[2.5rem] bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/25">
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#F7F9FC] px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#13796D]">Shamar Connect</p>
              <p className="mt-1 text-sm font-black text-[#132B57]">Central de atendimento</p>
            </div>
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-300" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-300" />
            </div>
          </div>

          <div className="grid min-h-[410px] grid-cols-[0.9fr_1.35fr]">
            <div className="border-r border-slate-100 bg-[#F7F9FC] p-4">
              {[
                ["Novo lead", "Aguardando", "2 min"],
                ["Orçamento", "Retorno hoje", "18 min"],
                ["Agendamento", "Triagem", "42 min"],
                ["Pós-venda", "Cliente respondeu", "1h"],
              ].map(([name, status, time], index) => (
                <div
                  key={name}
                  className={`mb-3 rounded-2xl border p-3 ${
                    index === 1 ? "border-[#2ABFAB]/30 bg-white shadow-sm" : "border-slate-100 bg-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-[#132B57]">{name}</p>
                    <p className="text-[11px] font-bold text-slate-400">{time}</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{status}</p>
                </div>
              ))}
            </div>

            <div className="bg-white p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-black text-[#132B57]">Maria Oliveira</p>
                  <p className="text-xs font-semibold text-slate-500">WhatsApp · Vendas</p>
                </div>
                <span className="rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-black text-[#13796D]">
                  Em atendimento
                </span>
              </div>

              <div className="space-y-3 py-5">
                <div className="max-w-[82%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  Consigo fechar o orçamento ainda hoje?
                </div>
                <div className="ml-auto max-w-[82%] rounded-2xl bg-[#132B57] px-4 py-3 text-sm text-white">
                  Sim. Já localizei seu atendimento e vou confirmar os detalhes.
                </div>
                <div className="max-w-[82%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  Pode enviar por aqui mesmo.
                </div>
              </div>

              <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                {[
                  ["Setor", "Vendas"],
                  ["Status", "Follow-up"],
                  ["Ação", "Orçamento"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#F7F9FC] p-3">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-xs font-black text-[#132B57]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 left-1/2 h-16 w-[80%] -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
    </div>
  );
}

export default async function HomePage() {
  const session = await getCurrentSession();
  const isAuthenticated = session !== null;

  return (
    <>
      <RecoveryHashRedirect />
      <section className="relative overflow-hidden bg-[#0B1220] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(42,191,171,0.22),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.10),transparent_28%)]" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rotate-12 rounded-[3rem] bg-white/5" />
        <div className="absolute right-24 top-24 h-52 w-52 rotate-12 rounded-[2.5rem] bg-[#2ABFAB]/10" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-black text-[#86F2E2] ring-1 ring-white/10">
              <ShieldCheck className="h-4 w-4" />
              Central de atendimento com CRM
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
              Organize o WhatsApp da empresa sem perder clientes pelo caminho.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              O Shamar Connect centraliza conversas, responsáveis, histórico e próximos passos para sua equipe atender melhor e vender com mais controle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/planos"
                className="inline-flex items-center justify-center rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-xl shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:bg-[#22A898]"
              >
                Ver planos
              </Link>
              <Link
                href="/contato"
                className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/8 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                Falar com especialista
              </Link>
              <Link
                href={isAuthenticated ? "/operations" : "/login"}
                className="inline-flex items-center justify-center rounded-full px-7 py-4 text-sm font-black text-white/80 transition hover:bg-white/8"
              >
                {isAuthenticated ? "Abrir plataforma" : "Entrar"}
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
              {quickBenefits.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/7 px-4 py-3 ring-1 ring-white/10">
                  <CheckMark />
                  <span className="text-sm font-bold text-white/82">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroProductVisual />
        </div>
      </section>

      <section id="produto" className="bg-[#F6F8FC] py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Benefícios para a operação</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
                Uma central simples para o que sua equipe faz todos os dias.
              </h2>
            </div>
            <p className="text-base leading-8 text-slate-600">
              Sem complicar o ERP, sem colocar robô solto e sem depender da memória do dono. O Shamar deixa a entrada do cliente organizada.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {operationCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#132B57]/5 text-[#132B57]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-black text-[#132B57]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#132B57] p-8 text-white shadow-2xl shadow-[#132B57]/15 md:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#86F2E2]">Como funciona</p>
              <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                Do primeiro contato ao retorno, cada etapa fica visível.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                A equipe sabe quem assumiu, o gestor sabe o que está parado e o cliente não fica perdido no meio da conversa.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {workflow.map((item, index) => (
              <div key={item} className="flex gap-4 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2ABFAB]/12 text-sm font-black text-[#13796D]">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black text-[#132B57]">{item}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {index === 0
                      ? "A entrada do cliente é registrada."
                      : index === 1
                        ? "A conversa ganha dono e prioridade."
                        : index === 2
                          ? "O contexto fica disponível para continuar."
                          : "A operação avança com clareza."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="segmentos" className="bg-[#F6F8FC] py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Quem usa</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
              Para empresas que atendem, vendem e precisam dar retorno.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment) => (
              <div key={segment} className="rounded-3xl border border-slate-200 bg-white px-5 py-5 text-sm font-black text-[#132B57] shadow-sm">
                {segment}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Planos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
              Comece com implantação assistida.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Escolha um plano base e evolua com add-ons conforme a operação crescer.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-[2rem] border bg-white p-7 shadow-sm ${
                  plan.featured ? "border-[#2ABFAB] shadow-xl shadow-[#2ABFAB]/10" : "border-slate-200"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-7 rounded-full bg-[#C9952A] px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
                    Mais indicado
                  </div>
                )}
                <h3 className="text-2xl font-black text-[#132B57]">{plan.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{plan.text}</p>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-black text-[#132B57]">{plan.price}</span>
                  <span className="pb-1 text-sm font-bold text-slate-500">/mês</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">{plan.setup}</p>
                <Link
                  href={plan.href}
                  className={`mt-7 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black transition hover:-translate-y-0.5 ${
                    plan.featured
                      ? "bg-[#2ABFAB] text-white shadow-lg shadow-[#2ABFAB]/20"
                      : "bg-[#132B57] text-white shadow-md shadow-[#132B57]/10"
                  }`}
                >
                  Escolher plano
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#0B1220] px-6 py-16 text-center text-white shadow-2xl shadow-[#132B57]/20 md:px-12">
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2ABFAB]/15 text-[#2ABFAB]">
              <Zap className="h-7 w-7" />
            </div>
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
              Organize seu atendimento antes de perder mais clientes.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
              Faça o checkout, siga para implantação assistida e comece com uma operação mais clara.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/planos"
                className="rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#22A898]"
              >
                Ver planos
              </Link>
              <Link
                href="/contato"
                className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Falar com especialista
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
