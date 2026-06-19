import Link from "next/link";
import { getFeaturedPosts, CATEGORIES } from "@/lib/blog/posts";

export function BlogFeatured() {
  const featured = getFeaturedPosts();

  return (
    <section className="bg-[#F8FAFC] py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#C9952A]">Destaques</p>
            <h2 className="mt-2 text-2xl font-black text-[#1B2F5B]">Artigos mais lidos</h2>
          </div>
          <Link href="/blog" className="text-sm font-black text-[#2ABFAB] hover:underline">
            Ver todos →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="group block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#1B2F5B]/8 px-3 py-1 text-xs font-black text-[#1B2F5B]">
                  {CATEGORIES[post.category]}
                </span>
                <span className="text-xs text-muted-foreground">{post.readTime}</span>
              </div>
              <h3 className="mt-4 text-base font-black leading-snug text-[#1B2F5B] group-hover:text-[#2ABFAB]">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.description}</p>
              <p className="mt-4 text-sm font-black text-[#2ABFAB]">Ler artigo →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
