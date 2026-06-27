import Link from "next/link";
import type { Metadata } from "next";

import { BlogCasosReais } from "@/components/site/blog-casos-reais";
import { BlogFeatured } from "@/components/site/blog-featured";
import { CATEGORIES, getPostsByCategory, posts, type Category } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — Shamar Connect",
  description:
    "Artigos práticos sobre CRM, WhatsApp, atendimento, vendas, automação e IA para empresas que querem transformar conversas em oportunidades reais.",
};

const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

type BlogPageProps = {
  searchParams?: Promise<{ categoria?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const activeCategory = CATEGORY_KEYS.includes(params?.categoria as Category)
    ? (params?.categoria as Category)
    : null;

  const filtered = getPostsByCategory(activeCategory);

  return (
    <>
      <section className="relative overflow-hidden bg-[#0B1220] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(42,191,171,0.22),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.10),transparent_28%)]" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rotate-12 rounded-[3rem] bg-white/5" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex rounded-full bg-white/8 px-4 py-2 text-sm font-black text-[#86F2E2] ring-1 ring-white/10">
              Blog Shamar Connect
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
              Conteúdo para vender mais e atender melhor pelo WhatsApp.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              Guias práticos sobre CRM, atendimento, vendas, follow-up, IA assistiva e organização para equipes que vivem no WhatsApp.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#artigos"
                className="rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:bg-[#22A898]"
              >
                Ver artigos
              </a>
              <Link
                href="/planos"
                className="rounded-full border border-white/18 bg-white/8 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                Conhecer planos
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2.25rem] bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/25">
                <div className="border-b border-slate-100 bg-[#F7F9FC] px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#13796D]">Central de conhecimento</p>
                  <p className="mt-1 text-sm font-black text-[#132B57]">Processos reais para atendimento e vendas</p>
                </div>

                <div className="grid gap-3 p-5">
                  {[
                    ["Atendimento", "Processos para responder melhor sem perder contexto"],
                    ["CRM", "Clientes, histórico e oportunidades em uma operação organizada"],
                    ["Vendas", "Follow-up, orçamentos e recuperação de conversas paradas"],
                    ["IA", "Apoio inteligente com humano no controle"],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                      <p className="text-sm font-black text-[#132B57]">{title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 h-16 w-[78%] -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${
                !activeCategory
                  ? "border-[#132B57] bg-[#132B57] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Todos
            </Link>
            {CATEGORY_KEYS.map((cat) => (
              <Link
                key={cat}
                href={`/blog?categoria=${cat}`}
                className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${
                  activeCategory === cat
                    ? "border-[#2ABFAB] bg-[#2ABFAB] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {CATEGORIES[cat]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!activeCategory ? <BlogFeatured /> : null}

      <section id="artigos" className="bg-[#F6F8FC] py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-10 grid gap-6 md:grid-cols-[0.85fr_1.15fr] md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">
                {activeCategory ? "Categoria" : "Todos os artigos"}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
                {activeCategory ? CATEGORIES[activeCategory] : "Conteúdo prático para operação comercial."}
              </h2>
            </div>
            <p className="text-base leading-8 text-slate-600">
              {activeCategory
                ? `${filtered.length} artigos selecionados para esse tema.`
                : `${posts.length} artigos publicados para ajudar sua empresa a organizar atendimento, vendas e relacionamento.`}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <article
                key={post.href}
                className="group flex min-h-[310px] flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/blog?categoria=${post.category}`}
                    className="rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-black text-[#13796D] hover:bg-[#2ABFAB]/20"
                  >
                    {post.categoryLabel}
                  </Link>
                  <span className="text-xs font-semibold text-slate-400">{post.readTime}</span>
                </div>

                <h2 className="mt-5 text-xl font-black leading-snug text-[#132B57] group-hover:text-[#13796D]">
                  {post.title}
                </h2>

                <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{post.description}</p>

                <Link
                  href={post.href}
                  className="mt-6 inline-flex w-fit rounded-full bg-[#132B57] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0E2147]"
                >
                  Ler artigo
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {!activeCategory ? <BlogCasosReais /> : null}

      <section className="px-5 py-20 md:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#0B1220] px-6 py-16 text-center text-white shadow-2xl shadow-[#132B57]/20 md:px-12">
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#86F2E2]">Shamar Connect</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
              Quer transformar conteúdo em operação organizada?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">
              Veja os planos e comece a organizar WhatsApp, CRM, histórico, responsáveis e próximos passos.
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
