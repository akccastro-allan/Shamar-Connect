import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-8 max-w-xs">
          <BrandLogo className="h-auto w-full" />
        </div>
        <h1 className="text-center text-2xl font-bold text-[#1B2F5B]">Entrar no ShamarConnect</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Acesse sua conta para gerenciar atendimentos, vendas e automações.</p>
        <a href="/api/auth/oauth?provider=google" className="mt-8 flex w-full justify-center rounded-xl bg-[#2ABFAB] px-4 py-3 font-semibold text-white hover:opacity-90">Entrar com Google</a>
        <div className="my-6 flex items-center gap-4"><div className="h-px flex-1 bg-slate-200" /><span className="text-xs font-semibold uppercase text-slate-400">ou</span><div className="h-px flex-1 bg-slate-200" /></div>
        <form action="/api/auth/login" method="post" className="space-y-4">
          <input name="email" type="email" placeholder="E-mail" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2ABFAB]" />
          <input name="password" type="password" placeholder="Senha" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2ABFAB]" />
          <div className="text-right"><Link href="/forgot-password" className="text-sm font-medium text-[#1B2F5B] hover:text-[#2ABFAB]">Esqueci minha senha</Link></div>
          <button type="submit" className="w-full rounded-xl bg-[#1B2F5B] px-4 py-3 font-semibold text-white hover:opacity-90">Entrar</button>
        </form>
      </section>
    </main>
  );
}
