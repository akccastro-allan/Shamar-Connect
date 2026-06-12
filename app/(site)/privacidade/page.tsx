import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Política de privacidade do ShamarConnect.",
};

const sections = [
  {
    title: "Dados tratados",
    text: "Coletamos e processamos informações necessárias para cadastro, acesso, suporte, segurança e uso das funcionalidades contratadas.",
  },
  {
    title: "Finalidade",
    text: "Os dados são utilizados para operar a plataforma, melhorar a experiência, prestar suporte, proteger contas e cumprir obrigações legais.",
  },
  {
    title: "Segurança",
    text: "Adotamos medidas técnicas e organizacionais para proteger as informações contra acesso indevido, perda, alteração ou uso não autorizado.",
  },
  {
    title: "Compartilhamento",
    text: "Dados podem ser compartilhados com provedores essenciais de infraestrutura, autenticação, hospedagem, comunicação e processamento do serviço.",
  },
  {
    title: "Direitos do usuário",
    text: "O usuário pode solicitar informações, correção, atualização ou exclusão de dados, conforme as regras aplicáveis e limites legais.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="bg-[#F8FAFC]">
      <section className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Privacidade</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Política de Privacidade do ShamarConnect
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          Esta página explica, de forma resumida, como o ShamarConnect trata informações relacionadas ao uso da plataforma.
        </p>

        <div className="mt-12 space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#1B2F5B]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/termos" className="rounded-full bg-[#1B2F5B] px-5 py-3 text-sm font-black text-white hover:bg-[#132344]">
            Ver Termos de Uso
          </Link>
          <Link href="/" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-[#1B2F5B] hover:border-[#2ABFAB]">
            Voltar para o início
          </Link>
        </div>
      </section>
    </main>
  );
}
