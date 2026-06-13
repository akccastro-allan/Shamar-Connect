import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do ShamarConnect.",
};

const sections = [
  {
    title: "Uso permitido da plataforma",
    text: "O ShamarConnect deve ser utilizado de forma lícita, ética e compatível com as leis aplicáveis. O usuário não deve usar a plataforma para envio de spam, fraude, violação de direitos de terceiros ou qualquer atividade proibida.",
  },
  {
    title: "Conta, acesso e responsabilidade do usuário",
    text: "O usuário é responsável por proteger suas credenciais, manter seus dados atualizados e controlar quem possui acesso à sua empresa dentro da plataforma. Ações realizadas por usuários autorizados podem gerar registros, atendimentos, oportunidades e alterações na operação.",
  },
  {
    title: "Planos, recursos e disponibilidade",
    text: "Os recursos disponíveis podem variar conforme o plano contratado, configuração da conta, integrações habilitadas e disponibilidade técnica dos serviços conectados. A plataforma pode receber melhorias, ajustes e atualizações para manter segurança, desempenho e qualidade.",
  },
  {
    title: "Integrações com serviços de terceiros",
    text: "Algumas funcionalidades dependem de serviços de terceiros, como provedores de autenticação, hospedagem, comunicação, inteligência artificial, WhatsApp, Google e outros serviços necessários à operação. O uso dessas integrações também pode estar sujeito aos termos e políticas dos respectivos provedores.",
  },
  {
    title: "Uso de OAuth do Google",
    text: "Quando o usuário optar por conectar uma conta Google, o ShamarConnect poderá solicitar autorização via OAuth para duas finalidades principais: identificação/autenticação da conta Google do usuário e integração com agenda/calendário para recursos de organização comercial, compromissos, lembretes ou eventos. O acesso somente ocorre mediante autorização do usuário e pode ser revogado nas configurações da conta Google.",
  },
  {
    title: "Limites do uso dos dados Google",
    text: "Os dados obtidos por integração com Google devem ser usados apenas para executar as funcionalidades autorizadas dentro do ShamarConnect. A plataforma não deve vender dados obtidos via Google, não deve usar esses dados para publicidade de terceiros e não deve permitir acesso humano ao conteúdo salvo quando isso não for necessário para suporte, segurança, obrigação legal ou execução do serviço solicitado.",
  },
  {
    title: "Suporte e contato oficial",
    text: "Dúvidas sobre uso, contratação, cobrança, privacidade, integração Google OAuth ou acesso devem ser tratadas pelos canais oficiais de suporte da Moriah Systems Serviços Ltda, responsável pelo ShamarConnect.",
  },
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
          Esta página reúne as condições gerais para uso da plataforma ShamarConnect, incluindo regras de acesso, integrações e uso de dados autorizados pelo usuário.
        </p>

        <div className="mt-12 space-y-4">
          {sections.map((section, index) => (
            <article key={section.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#1B2F5B]">{index + 1}. {section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/privacidade" className="rounded-full bg-[#1B2F5B] px-5 py-3 text-sm font-black text-white hover:bg-[#132344]">
            Ver Política de Privacidade
          </Link>
          <Link href="/" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-[#1B2F5B] hover:border-[#2ABFAB]">
            Voltar para o início
          </Link>
        </div>
      </section>
    </main>
  );
}
