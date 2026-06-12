import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do ShamarConnect.",
};

const items = [
  "O ShamarConnect deve ser utilizado de forma lícita, ética e compatível com as leis aplicáveis.",
  "O usuário é responsável por proteger suas credenciais de acesso e por manter seus dados atualizados.",
  "Os recursos disponíveis podem variar conforme o plano contratado e a configuração da conta.",
  "A plataforma pode receber melhorias, ajustes e atualizações para manter segurança, desempenho e qualidade.",
  "Dúvidas sobre uso, contratação, cobrança ou acesso devem ser tratadas pelos canais oficiais de suporte.",
];

export default function TermsPage() {
  return (
    <main className="bg-[#F8FAFC]">
      <section className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Termos de Uso</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Regras de uso do ShamarConnect
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          Esta página reúne as condições gerais para uso da plataforma ShamarConnect.
        </p>

        <div className="mt-12 space-y-4">
          {items.map((item, index) => (
            <article key={item} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#1B2F5B]">{index + 1}. Condição de uso</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-black text-[#1B2F5B] hover:text-[#2ABFAB]">
            Voltar para o início
          </Link>
        </div>
      </section>
    </main>
  );
}
