import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conteudos sobre atendimento pelo WhatsApp, CRM, vendas, automacao comercial e inteligencia artificial para pequenas e medias empresas.",
};

const posts = [
  {
    title: "Como organizar o histórico de clientes no WhatsApp",
    description: "Guia pratico para organizar historico de clientes, conversas e contexto no atendimento.",
    href: "/blog/como-organizar-o-historico-de-clientes-no-whatsapp",
    category: "Historico de clientes",
    readTime: "7 min",
  },
  {
    title: "Transcrição de áudio no WhatsApp: por que isso ajuda no atendimento",
    description: "Guia pratico sobre transcricao de audio e ganho de produtividade no atendimento.",
    href: "/blog/transcricao-de-audio-no-whatsapp-ajuda-no-atendimento",
    category: "IA no atendimento",
    readTime: "7 min",
  },
  {
    title: "IA no atendimento pelo WhatsApp: como usar sem perder o toque humano",
    description: "Guia pratico sobre uso de IA para apoiar o atendimento comercial pelo WhatsApp.",
    href: "/blog/ia-no-atendimento-pelo-whatsapp-como-usar-sem-perder-o-toque-humano",
    category: "IA no atendimento",
    readTime: "7 min",
  },
  {
    title: "Como transformar conversas do WhatsApp em oportunidades de venda",
    description:
      "Veja como transformar conversas do WhatsApp em oportunidades de venda com qualificação, CRM, funil, histórico e próxima ação.",
    href: "/blog/como-transformar-conversas-do-whatsapp-em-oportunidades-de-venda",
    category: "Oportunidades de venda",
    readTime: "7 min",
  },
  {
    title: "Como acompanhar orçamentos enviados pelo WhatsApp",
    description:
      "Veja como acompanhar orçamentos enviados pelo WhatsApp com follow-up, etapas comerciais, CRM, histórico e controle de oportunidades.",
    href: "/blog/como-acompanhar-orcamentos-enviados-pelo-whatsapp",
    category: "Orçamentos pelo WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Respostas rápidas no WhatsApp: como padronizar o atendimento",
    description:
      "Veja como usar respostas rápidas no WhatsApp para padronizar atendimento comercial, reduzir tempo de resposta e melhorar vendas.",
    href: "/blog/respostas-rapidas-no-whatsapp-como-padronizar-o-atendimento-comercial",
    category: "Respostas rápidas",
    readTime: "7 min",
  },
  {
    title: "Como responder clientes mais rápido no WhatsApp sem perder qualidade",
    description:
      "Veja como responder clientes mais rápido no WhatsApp sem perder qualidade usando respostas rápidas, CRM, organização, equipe e IA.",
    href: "/blog/como-responder-clientes-mais-rapido-no-whatsapp-sem-perder-qualidade",
    category: "Atendimento pelo WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Atendimento multiatendente no WhatsApp: quando usar",
    description:
      "Entenda quando sua empresa precisa de atendimento multiatendente no WhatsApp e como organizar responsáveis, histórico, CRM e equipe.",
    href: "/blog/atendimento-multiatendente-no-whatsapp-quando-sua-empresa-precisa-disso",
    category: "Atendimento multiatendente",
    readTime: "7 min",
  },
  {
    title: "CRM com WhatsApp: como funciona na prática",
    description:
      "Entenda como um CRM com WhatsApp ajuda a organizar conversas, clientes, oportunidades, funil de vendas, follow-ups e atendimento comercial.",
    href: "/blog/crm-com-whatsapp-como-funciona-na-pratica",
    category: "CRM WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Funil de vendas no WhatsApp: como acompanhar cada cliente",
    description:
      "Entenda como usar um funil de vendas no WhatsApp para acompanhar clientes, orçamentos, follow-ups, negociações e fechamentos.",
    href: "/blog/funil-de-vendas-no-whatsapp-como-acompanhar-cada-cliente",
    category: "Funil de vendas",
    readTime: "7 min",
  },
  {
    title: "Como controlar atendentes no WhatsApp sem perder qualidade",
    description:
      "Veja como controlar atendentes no WhatsApp com responsáveis, histórico, respostas rápidas, indicadores, CRM e IA sem perder qualidade.",
    href: "/blog/como-controlar-atendentes-no-whatsapp-sem-perder-qualidade",
    category: "Gestão de atendimento",
    readTime: "7 min",
  },
  {
    title: "Melhor CRM para pequenas empresas: como escolher sem complicar",
    description:
      "Saiba como escolher o melhor CRM para pequenas empresas considerando simplicidade, WhatsApp, funil de vendas, equipe e controle comercial.",
    href: "/blog/melhor-crm-para-pequenas-empresas-como-escolher-sem-complicar",
    category: "CRM para pequenas empresas",
    readTime: "7 min",
  },
  {
    title: "Como não perder vendas que chegam pelo WhatsApp",
    description:
      "Entenda como evitar perdas comerciais no WhatsApp com organização, CRM, follow-up, etapas de venda e acompanhamento da equipe.",
    href: "/blog/como-nao-perder-vendas-que-chegam-pelo-whatsapp",
    category: "Vendas pelo WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Como organizar clientes no WhatsApp sem perder vendas",
    description:
      "Veja como organizar clientes no WhatsApp, controlar orcamentos, acompanhar follow-ups e evitar perdas comerciais com ajuda de CRM.",
    href: "/blog/como-organizar-clientes-no-whatsapp-sem-perder-vendas",
    category: "Atendimento comercial",
    readTime: "7 min",
  },
  {
    title: "CRM para WhatsApp: como organizar vendas e atendimento em um só lugar",
    description:
      "Entenda como um CRM para WhatsApp ajuda pequenas empresas a organizar atendimento, vendas, clientes e oportunidades em um só lugar.",
    href: "/blog/crm-para-whatsapp-como-organizar-vendas-e-atendimento-em-um-so-lugar",
    category: "CRM WhatsApp",
    readTime: "7 min",
  },
];

const topics = [
  "CRM para WhatsApp",
  "Atendimento comercial",
  "Automacao de vendas",
  "Inteligencia artificial no atendimento",
  "Organizacao de contatos",
  "Funil de vendas para pequenas empresas",
];

export default function BlogPage() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">
            Blog ShamarConnect
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Conteudos para vender mais e atender melhor pelo WhatsApp
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Artigos sobre CRM, WhatsApp, atendimento, vendas, automacao e IA para empresas que querem transformar conversas em oportunidades reais.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.href} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg">
              <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#C9952A]">
                <span>{post.category}</span>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="mt-4 text-2xl font-black text-[#1B2F5B]">{post.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{post.description}</p>
              <Link href={post.href} className="mt-6 inline-flex rounded-full bg-[#2ABFAB] px-5 py-3 font-black text-white">
                Ler artigo
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <article key={topic} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-7 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C9952A]">
                Em breve
              </p>
              <h2 className="mt-4 text-xl font-black text-[#1B2F5B]">{topic}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Conteudo em preparacao para ajudar gestores, vendedores e equipes de atendimento a organizarem melhor a operacao comercial.
              </p>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black md:text-4xl">Quer organizar seu atendimento agora?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Enquanto os artigos estao sendo preparados, conheca os planos do ShamarConnect e veja como centralizar sua operacao comercial.
          </p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">
            Ver planos
          </Link>
        </div>
      </section>
    </main>
  );
}
