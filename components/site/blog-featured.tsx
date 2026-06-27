import Link from "next/link";

import { CATEGORIES, getFeaturedPosts } from "@/lib/blog/posts";

export function BlogFeatured() {
  const featured = getFeaturedPosts();

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10 grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Destaques</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
              Artigos para começar.
            </h2>
          </div>
          <p className="text-base leading-8 text-slate-600">
            Leitura direta para quem quer organizar atendimento, CRM, WhatsApp e vendas sem complicar a operação.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 6).map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="group block rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2ABFAB]/40 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#132B57]/8 px-3 py-1 text-xs font-black text-[#132B57]">
                  {CATEGORIES[post.category]}
                </span>
                <span className="text-xs font-semibold text-slate-400">{post.readTime}</span>
              </div>
              <h3 className="mt-4 text-lg font-black leading-snug text-[#132B57] group-hover:text-[#13796D]">
                {post.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.description}</p>
              <p className="mt-5 text-sm font-black text-[#13796D]">Ler artigo →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
