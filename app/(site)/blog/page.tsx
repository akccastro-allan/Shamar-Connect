import Link from "next/link";
import type { Metadata } from "next";
import { BlogFeatured } from "@/components/site/blog-featured";
import { BlogCasosReais } from "@/components/site/blog-casos-reais";
import { posts, CATEGORIES, getPostsByCategory, type Category } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — ShamarConnect",
  description:
    "Artigos sobre CRM, WhatsApp, atendimento, vendas, automação e IA para empresas que querem transformar conversas em oportunidades reais.",
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
      {/* Hero */}
      <section className="bg-white pt-16 pb-10">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Blog ShamarConnect</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">
              Conteúdo para vender mais e atender melhor pelo WhatsApp
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Artigos práticos sobre CRM, WhatsApp, atendimento, vendas, IA e organização para equipes comerciais.
            </p>
          </div>

          {/* Category filter */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-5 py-2 text-sm font-black transition ${
                !activeCategory
                  ? "border-[#1B2F5B] bg-[#1B2F5B] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Todos
            </Link>
            {CATEGORY_KEYS.map((cat) => (
              <Link
                key={cat}
                href={`/blog?categoria=${cat}`}
                className={`rounded-full border px-5 py-2 text-sm font-black transition ${
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

      {/* Featured — only on unfiltered view */}
      {!activeCategory && <BlogFeatured />}

      {/* Post grid */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          {activeCategory && (
            <div className="mb-8 flex items-center gap-3">
              <h2 className="text-xl font-black text-[#1B2F5B]">{CATEGORIES[activeCategory]}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {filtered.length} artigos
              </span>
            </div>
          )}

          {!activeCategory && (
            <div className="mb-8">
              <h2 className="text-xl font-black text-[#1B2F5B]">Todos os artigos</h2>
              <p className="mt-1 text-sm text-slate-500">{posts.length} artigos publicados</p>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <article
                key={post.href}
                className="group rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/blog?categoria=${post.category}`}
                    className="rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-black text-[#13796D] hover:bg-[#2ABFAB]/20"
                  >
                    {post.categoryLabel}
                  </Link>
                  <span className="text-xs text-slate-400">{post.readTime}</span>
                </div>
                <h2 className="mt-4 text-xl font-black leading-snug text-[#1B2F5B]">{post.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{post.description}</p>
                <Link
                  href={post.href}
                  className="mt-6 inline-flex rounded-full bg-[#2ABFAB] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Ler artigo
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Casos Reais — only on unfiltered view */}
      {!activeCategory && <BlogCasosReais />}

      {/* CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="overflow-hidden rounded-[2rem] bg-[#1B2F5B] px-6 py-14 text-center text-white shadow-2xl md:px-12">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2ABFAB]">ShamarConnect</p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
              Pronto para organizar seu atendimento?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/70">
              Veja como centralizar WhatsApp, CRM, histórico e IA em uma única plataforma.
            </p>
            <Link
              href="/planos"
              className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
