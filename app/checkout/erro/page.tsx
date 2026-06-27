import Link from "next/link";

export default function CheckoutErroPage() {
  return (
    <main className="min-h-screen bg-[#F6F8FC] text-slate-950">
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8"><Link href="/" className="text-xl font-black tracking-tight text-[#132B57] md:text-2xl">Shamar Connect</Link><Link href="/planos" className="rounded-full bg-[#132B57] px-5 py-2.5 text-sm font-black text-white">Planos</Link></div></header>
      <section className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8"><div className="rounded-[2.25rem] border border-red-100 bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl font-black text-red-600">×</div><p className="mt-7 text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Falha no checkout</p><h1 className="mt-3 text-4xl font-black tracking-tight text-[#132B57] md:text-5xl">Não foi possível concluir o pagamento.</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">Ocorreu uma falha ao gerar ou concluir o pagamento. Tente novamente ou fale com a equipe para receber suporte na contratação.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/checkout?plan=professional" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20">Tentar novamente</Link><Link href="/contato" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-sm font-black text-[#132B57]">Falar com suporte</Link></div></div></section>
    </main>
  );
}
