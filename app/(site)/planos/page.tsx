import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos",
  description: "Planos do ShamarConnect para atendimento via WhatsApp, CRM, automacoes e IA.",
};

const plans = [
  {
    name: "Starter",
    price: "R$ 97",
    desc: "Para empresas que precisam organizar o atendimento inicial.",
    items: ["1 empresa", "2 usuarios", "CRM basico", "WhatsApp central", "Respostas rapidas"],
  },
  {
    name: "Professional",
    price: "R$ 197",
    desc: "Para equipes comerciais que precisam vender com processo.",
    items: ["Multiatendente", "CRM completo", "Funil de vendas", "Relatorios", "Templates de atendimento"],
    featured: true,
  },
  {
    name: "Business",
    price: "R$ 397",
    desc: "Para operacoes que precisam de automacoes e integracao local.",
    items: ["Tudo do Professional", "Agent local", "Catalogo", "Automacoes", "Suporte prioritario"],
  },
];

const rows = [
  ["Empresas", "1", "Multiplas", "Multiplas"],
  ["Usuarios", "2", "Equipe", "Equipe ampliada"],
  ["CRM", "Basico", "Completo", "Completo"],
  ["Automacoes", "-", "Basicas", "Avancadas"],
  ["Agent local", "-", "-", "Incluso"],
  ["Modulo IA", "+ R$ 79/mes", "+ R$ 79/mes", "+ R$ 79/mes"],
];

export default function PlanosPage() {
  return (
    <main className="bg-[#F8FAFC] text-slate-950">
      <section className="bg-[#1B2F5B] px-6 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2ABFAB]">Planos</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Escolha o plano ideal para sua equipe</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-200">Comece organizando o WhatsApp e evolua para CRM completo, automacoes, Agent local e IA conforme sua operacao crescer.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative rounded-[2rem] border bg-white p-8 shadow-sm ${plan.featured ? "border-[#2ABFAB] ring-4 ring-[#2ABFAB]/10" : "border-slate-200"}`}>
              {plan.featured ? <span className="absolute right-6 top-6 rounded-full bg-[#2ABFAB]/10 px-3 py-1 text-xs font-black text-[#1B2F5B]">Mais popular</span> : null}
              <h2 className="text-2xl font-black text-[#1B2F5B]">{plan.name}</h2>
              <p className="mt-4 text-5xl font-black text-[#2ABFAB]">{plan.price}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">por mes</p>
              <p className="mt-6 min-h-16 text-sm leading-7 text-slate-600">{plan.desc}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-3"><span className="font-black text-[#2ABFAB]">✓</span>{item}</li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 inline-flex w-full justify-center rounded-full bg-[#1B2F5B] px-6 py-3 text-sm font-black text-white transition hover:bg-[#132344]">Comecar agora</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-2xl font-black text-[#1B2F5B]">Comparativo rapido</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[#1B2F5B]"><tr>{["Recurso", "Starter", "Professional", "Business"].map((h) => <th key={h} className="p-5 font-black">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]} className="border-t border-slate-100">{row.map((cell) => <td key={cell} className="p-5 text-slate-700">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#1B2F5B] p-10 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-black">O Modulo IA pode ser adicionado a qualquer plano</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">Por + R$ 79/mes, sua equipe ganha sugestoes de resposta, resumo de conversa e transcricao de audio.</p>
          <Link href="/login" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 text-sm font-black text-[#10233F]">Criar minha conta</Link>
        </div>
      </section>
    </main>
  );
}
