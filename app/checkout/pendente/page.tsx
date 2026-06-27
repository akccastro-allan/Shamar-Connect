import Link from "next/link";

export default function CheckoutPendentePage() {
  return (
    <main className="min-h-screen bg-[#F6F8FC] text-slate-950">
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8"><Link href="/" className="text-xl font-black tracking-tight text-[#132B57] md:text-2xl">Shamar Connect</Link><Link href="/planos" className="rounded-full bg-[#132B57] px-5 py-2.5 text-sm font-black text-white">Planos</Link></div></header>
      <section className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8"><div className="rounded-[2.25rem] border border-[#C9952A]/20 bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7E8] text-3xl font-black text-[#C9952A]">!</div><p className="mt-7 text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Aguardando confirmação</p><h1 className="mt-3 text-4xl font-black tracking-tight text-[#132B57] md:text-5xl">Pagamento pendente.</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">O checkout foi iniciado, mas ainda não recebemos confirmação de pagamento. A ativação acontece após confirmação pelo Asaas.</p><div className="mt-8 rounded-3xl bg-[#FFF7E8] p-6 text-left text-sm leading-7 text-[#8A5D12]"><p className="font-black">Importante:</p><p>PIX costuma confirmar mais rápido. Boleto pode levar mais tempo para compensar.</p></div><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/planos" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20">Voltar aos planos</Link><Link href="/contato" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-sm font-black text-[#132B57]">Falar com suporte</Link></div></div></section>
    </main>
  );
}
