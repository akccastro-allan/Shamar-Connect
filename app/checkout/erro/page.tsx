import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function CheckoutErroPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center" aria-label="ShamarConnect">
            <BrandLogo variant="mark" className="h-11 w-auto object-contain md:h-12" />
          </Link>
          <Link href="/planos" className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white">Planos</Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8">
        <div className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl font-black text-red-600">×</div>
          <h1 className="mt-7 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-5xl">Não foi possível concluir o checkout</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Ocorreu uma falha ao gerar ou concluir o pagamento. Tente novamente ou fale com a equipe para receber suporte na contratação.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/checkout?plan=professional" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20">Tentar novamente</Link>
            <Link href="/contato" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-sm font-black text-[#1B2F5B]">Falar com suporte</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
