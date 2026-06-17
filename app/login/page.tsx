import { BrandLogo } from "@/components/brand/brand-logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-8 max-w-xs">
          <BrandLogo className="h-auto w-full" />
        </div>

        <h1 className="text-center text-2xl font-bold text-[#1B2F5B]">
          Entrar no ShamarConnect
        </h1>

        <p className="mt-2 text-center text-sm text-slate-500">
          Acesse sua conta para gerenciar atendimentos, vendas e automações.
        </p>

        <a
          href="/api/auth/oauth?provider=google"
          className="mt-8 flex w-full justify-center rounded-xl bg-[#2ABFAB] px-4 py-3 font-semibold text-white hover:opacity-90"
        >
          Entrar com Google
        </a>

        <p className="mt-6 text-center text-xs text-slate-400">
          O acesso é liberado apenas para usuários vinculados a uma empresa ativa.
        </p>
      </section>
    </main>
  );
}

