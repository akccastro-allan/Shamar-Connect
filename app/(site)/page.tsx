import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const features = [
  ["WhatsApp Central", "Gerencie todas as conversas em um único painel organizado."],
  ["CRM Completo", "Cadastre contatos, acompanhe o funil e registre oportunidades."],
  ["Respostas Rápidas", "Crie templates e responda clientes em segundos."],
  ["IA Assistida", "Sugestões de resposta, transcrição de áudio e resumo de conversa."],
];

const steps = [
  ["1", "Conecte seu WhatsApp", "Vincule seu número em minutos."],
  ["2", "Importe seus contatos", "Traga sua base de clientes."],
  ["3", "Comece a atender", "Gerencie tudo pelo painel."],
];

const plans = [
  ["Starter", "R$ 97/mês", "1 empresa", "2 usuários", "CRM básico", "WhatsApp central"],
  ["Professional", "R$ 197/mês", "Multiatendente", "CRM completo", "Respostas rápidas", "Relatórios"],
  ["Business", "R$ 397/mês", "Tudo do Professional", "Agent local", "Catálogo", "Automações"],
];

const faqs = [
  ["Preciso de número oficial do WhatsApp?", "Não, funciona com WhatsApp Web comum."],
  ["Quantos atendentes posso ter?", "Depende do plano — de 2 a 15 usuários."],
  ["Meus dados ficam seguros?", "Sim, hospedamos na Supabase com criptografia."],
  ["Posso cancelar quando quiser?", "Sim, sem fidelidade ou multa."],
  ["Tem suporte em português?", "Sim, suporte 100% em português."],
  ["O que é o Módulo IA?", "Add-on com sugestões de resposta, transcrição de áudio e resumo por R$ 79/mês."],
];

export default function HomePage() {
  return (
    <main className="bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="w-48 md:w-64"><BrandLogo className="h-auto w-full" /></Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex">
            <a href="#funcionalidades" className="hover:text-[#1B2F5B]">Funcionalidades</a>
            <a href="#planos" className="hover:text-[#1B2F5B]">Planos</a>
            <a href="#faq" className="hover:text-[#1B2F5B]">FAQ</a>
          </nav>
          <Link href="/login" className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white">Entrar</Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="inline-flex rounded-full bg-[#2ABFAB]/10 px-4 py-2 text-sm font-black text-[#13796D]">WhatsApp • CRM • IA</p>
            <h1 className="mt-7 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">Atenda mais, venda mais e organize seu WhatsApp</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">CRM, automações e IA para pequenas e médias empresas. Do primeiro contato à venda fechada, tudo em um lugar.</p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/login" className="rounded-full bg-[#2ABFAB] px-7 py-4 text-center font-black text-white shadow-lg">Começar agora</Link>
              <Link href="/planos" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-center font-black text-[#1B2F5B]">Ver planos</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="rounded-[1.5rem] bg-[#1B2F5B] p-6 text-white">
              <p className="text-sm font-bold text-[#2ABFAB]">Painel ShamarConnect</p>
              <h2 className="mt-2 text-2xl font-black">Atendimento em controle</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">{["36 atendimentos", "18 oportunidades", "7 negociações"].map((item) => <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-bold">{item}</div>)}</div>
            </div>
            {["Novo lead recebido", "Orçamento enviado", "Cliente pronto para fechar"].map((item) => <div key={item} className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 font-black text-[#1B2F5B] shadow-sm">{item}</div>)}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Funcionalidades</p><h2 className="mt-3 text-3xl font-black text-[#1B2F5B] md:text-5xl">Tudo para vender melhor pelo WhatsApp</h2></div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">{features.map(([title, text]) => <article key={title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2ABFAB]/10 font-black text-[#2ABFAB]">✓</span><h3 className="mt-5 text-lg font-black text-[#1B2F5B]">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}</div>
      </section>

      <section className="bg-white py-20"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Como funciona</p><h2 className="mt-3 text-3xl font-black text-[#1B2F5B] md:text-5xl">Sua operação pronta em poucos passos</h2></div><div className="mt-12 grid gap-6 md:grid-cols-3">{steps.map(([n, title, text]) => <article key={title} className="rounded-[2rem] bg-[#F8FAFC] p-8 ring-1 ring-slate-200"><span className="font-black text-[#C9952A]">{n}</span><h3 className="mt-5 text-xl font-black text-[#1B2F5B]">{title}</h3><p className="mt-3 text-slate-600">{text}</p></article>)}</div></div></section>

      <section id="planos" className="bg-[#1B2F5B] py-20 text-white"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black uppercase tracking-[0.25em] text-[#2ABFAB]">Planos</p><h2 className="mt-3 text-3xl font-black md:text-5xl">Escolha o plano ideal</h2></div><div className="mt-12 grid gap-6 lg:grid-cols-3">{plans.map(([name, price, ...items]) => <article key={name} className={`rounded-[2rem] p-7 shadow-xl ${name === "Professional" ? "bg-white text-slate-950 ring-2 ring-[#2ABFAB]" : "bg-white/10 ring-1 ring-white/15"}`}><div className="flex items-center justify-between gap-3"><h3 className="text-2xl font-black">{name}</h3>{name === "Professional" && <span className="rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-black text-[#1B2F5B]">Mais popular</span>}</div><p className="mt-5 text-4xl font-black text-[#2ABFAB]">{price}</p><ul className="mt-7 space-y-3 text-sm">{items.map((item) => <li key={item} className="flex gap-3"><span className="font-black text-[#2ABFAB]">✓</span>{item}</li>)}</ul><Link href="/login" className="mt-8 inline-flex w-full justify-center rounded-full bg-[#2ABFAB] px-5 py-3 font-black text-white">Começar</Link></article>)}</div><p className="mt-8 rounded-3xl border border-[#C9952A]/40 bg-[#C9952A]/10 p-6 text-center"><strong className="text-[#F1C66B]">Módulo IA:</strong> + R$ 79/mês disponível para todos os planos.</p></div></section>

      <section id="faq" className="bg-white py-20"><div className="mx-auto max-w-4xl px-5 md:px-8"><div className="text-center"><p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">FAQ</p><h2 className="mt-3 text-3xl font-black text-[#1B2F5B] md:text-5xl">Perguntas frequentes</h2></div><div className="mt-12 space-y-4">{faqs.map(([q, a]) => <details key={q} className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-6"><summary className="cursor-pointer list-none font-black text-[#1B2F5B]">{q}</summary><p className="mt-4 text-sm leading-7 text-slate-600">{a}</p></details>)}</div></div></section>

      <section className="px-5 py-20 md:px-8"><div className="mx-auto max-w-6xl rounded-[2rem] bg-[#1B2F5B] px-6 py-16 text-center text-white shadow-2xl"><h2 className="mx-auto max-w-3xl text-3xl font-black md:text-5xl">Pronto para transformar seu atendimento?</h2><p className="mt-5 text-lg text-white/70">Comece hoje mesmo. Sem cartão de crédito.</p><Link href="/login" className="mt-9 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Criar minha conta grátis</Link></div></section>
    </main>
  );
}
