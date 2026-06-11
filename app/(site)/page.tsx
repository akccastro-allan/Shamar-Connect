import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const features = [
["WhatsApp Central", "Gerencie todas as conversas em um único painel, sem perder mensagens importantes."],
["CRM Completo", "Cadastre contatos, acompanhe o funil e registre oportunidades de venda."],
["Respostas Rápidas", "Crie modelos de atendimento e responda clientes em segundos."],
["IA Assistida", "Use sugestões, resumos e transcrições para acelerar o atendimento."],
];

const steps = [
"Conecte seu WhatsApp",
"Organize seus contatos",
"Atenda e venda pelo painel",
];

const plans = [
["Starter", "R$ 97/mês", "Para começar com organização e CRM básico."],
["Professional", "R$ 197/mês", "Para equipes com multiatendimento e funil completo."],
["Business", "R$ 397/mês", "Para empresas que precisam de automações, catálogo e Agent."],
];

const faqs = [
["Preciso de número oficial?", "Não. A operação pode funcionar com WhatsApp Web."],
["Posso ter mais de um atendente?", "Sim. Os planos permitem equipes de atendimento conforme a necessidade."],
["O sistema tem IA?", "Sim. O módulo de IA pode apoiar respostas, resumos e transcrição de áudio."],
["Posso cancelar quando quiser?", "Sim. A proposta é simples e sem fidelidade obrigatória."],
];

export default function HomePage() {
return ( <main className="min-h-screen bg-[#F8FAFC] text-slate-900"> <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"> <Link href="/" className="block w-48"> <BrandLogo className="h-auto w-full" /> </Link> <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"> <a href="#funcionalidades" className="hover:text-[#1B2F5B]">Funcionalidades</a> <a href="#planos" className="hover:text-[#1B2F5B]">Planos</a> <a href="#faq" className="hover:text-[#1B2F5B]">FAQ</a> </nav> <Link href="/login" className="rounded-xl bg-[#1B2F5B] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
Entrar </Link> </header>

```
  <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
    <div>
      <p className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2ABFAB] shadow-sm">
        CRM, WhatsApp e IA para pequenas empresas
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-[#1B2F5B] md:text-6xl">
        Atenda mais, venda mais e organize seu WhatsApp
      </h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">
        O ShamarConnect centraliza conversas, contatos, oportunidades e automações em um painel simples para sua equipe vender melhor.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/login" className="rounded-xl bg-[#2ABFAB] px-6 py-3 font-semibold text-white shadow-sm hover:opacity-90">
          Começar agora
        </Link>
        <Link href="#planos" className="rounded-xl border border-[#1B2F5B] px-6 py-3 font-semibold text-[#1B2F5B] hover:bg-white">
          Ver planos
        </Link>
      </div>
    </div>

    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="rounded-2xl bg-[#1B2F5B] p-5 text-white">
        <p className="text-sm text-white/70">Painel de atendimento</p>
        <h2 className="mt-2 text-2xl font-bold">Fila organizada</h2>
      </div>
      <div className="mt-5 space-y-3">
        {["Novo lead recebido", "Orçamento enviado", "Cliente pronto para fechar"].map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
            <span className="font-medium text-[#1B2F5B]">{item}</span>
            <span className="rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-semibold text-[#2ABFAB]">ativo</span>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section id="funcionalidades" className="mx-auto max-w-6xl px-6 py-16">
    <div className="max-w-2xl">
      <p className="font-semibold text-[#C9952A]">Funcionalidades</p>
      <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
        Tudo que sua operação precisa para atender melhor
      </h2>
    </div>
    <div className="mt-10 grid gap-5 md:grid-cols-4">
      {features.map(([title, text]) => (
        <article key={title} className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#1B2F5B]">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
        </article>
      ))}
    </div>
  </section>

  <section className="bg-white py-16">
    <div className="mx-auto max-w-6xl px-6">
      <p className="font-semibold text-[#C9952A]">Como funciona</p>
      <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
        Comece sem complicação
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step} className="rounded-2xl bg-[#F8FAFC] p-6">
            <span className="text-sm font-bold text-[#2ABFAB]">Passo {index + 1}</span>
            <h3 className="mt-3 text-xl font-bold text-[#1B2F5B]">{step}</h3>
          </article>
        ))}
      </div>
    </div>
  </section>

  <section id="planos" className="mx-auto max-w-6xl px-6 py-16">
    <div className="text-center">
      <p className="font-semibold text-[#C9952A]">Planos</p>
      <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
        Escolha o melhor plano para sua operação
      </h2>
    </div>
    <div className="mt-10 grid gap-5 md:grid-cols-3">
      {plans.map(([name, price, text]) => (
        <article key={name} className="rounded-3xl bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-[#1B2F5B]">{name}</h3>
          <p className="mt-4 text-3xl font-bold text-[#2ABFAB]">{price}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{text}</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#1B2F5B] px-5 py-3 font-semibold text-white hover:opacity-90">
            Começar
          </Link>
        </article>
      ))}
    </div>
  </section>

  <section id="faq" className="mx-auto max-w-4xl px-6 py-16">
    <div className="text-center">
      <p className="font-semibold text-[#C9952A]">FAQ</p>
      <h2 className="mt-2 text-3xl font-bold text-[#1B2F5B] md:text-4xl">
        Perguntas frequentes
      </h2>
    </div>
    <div className="mt-10 space-y-3">
      {faqs.map(([question, answer]) => (
        <details key={question} className="rounded-2xl bg-white p-5 shadow-sm">
          <summary className="cursor-pointer font-semibold text-[#1B2F5B]">{question}</summary>
          <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>
        </details>
      ))}
    </div>
  </section>

  <section className="px-6 py-16">
    <div className="mx-auto max-w-5xl rounded-3xl bg-[#1B2F5B] px-6 py-12 text-center text-white">
      <h2 className="text-3xl font-bold md:text-4xl">
        Pronto para transformar seu atendimento?
      </h2>
      <p className="mt-4 text-white/75">Comece hoje. Sem cartão de crédito.</p>
      <Link href="/login" className="mt-8 inline-flex rounded-xl bg-[#2ABFAB] px-6 py-3 font-semibold text-white hover:opacity-90">
        Criar minha conta grátis
      </Link>
    </div>
  </section>
</main>
```

);
}
