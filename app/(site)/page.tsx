import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-10 w-full max-w-xs">
          <BrandLogo className="h-auto w-full" />
        </div>

        <p className="mb-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2ABFAB] shadow-sm">
          CRM, WhatsApp e IA para pequenas empresas
        </p>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#1B2F5B] md:text-6xl">
          Atenda mais, venda mais e organize seu WhatsApp
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          O ShamarConnect centraliza conversas, contatos, oportunidades e automações em um painel simples para sua equipe vender melhor.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/login" className="rounded-xl bg-[#2ABFAB] px-6 py-3 font-semibold text-white shadow-sm hover:opacity-90">
            Começar agora
          </Link>
          <Link href="/planos" className="rounded-xl border border-[#1B2F5B] px-6 py-3 font-semibold text-[#1B2F5B] hover:bg-white">
            Ver planos
          </Link>
        </div>

        <div className="mt-14 grid w-full gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 text-left shadow-sm">
            <h2 className="font-bold text-[#1B2F5B]">WhatsApp Central</h2>
            <p className="mt-2 text-sm text-slate-600">Todas as conversas em um único painel.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-left shadow-sm">
            <h2 className="font-bold text-[#1B2F5B]">CRM Completo</h2>
            <p className="mt-2 text-sm text-slate-600">Contatos, funil, oportunidades e histórico.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-left shadow-sm">
            <h2 className="font-bold text-[#1B2F5B]">IA Assistida</h2>
            <p className="mt-2 text-sm text-slate-600">Sugestões, resumos e apoio ao atendimento.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
