import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Política de privacidade do ShamarConnect.",
};

const sections = [
  {
    title: "Dados tratados",
    text: "Coletamos e processamos informações necessárias para cadastro, acesso, suporte, segurança, contratação, operação da plataforma e uso das funcionalidades habilitadas pelo cliente.",
  },
  {
    title: "Finalidade do tratamento",
    text: "Os dados são utilizados para operar a plataforma, melhorar a experiência, prestar suporte, proteger contas, registrar atendimentos, organizar clientes e oportunidades comerciais, cumprir obrigações legais e executar integrações autorizadas.",
  },
  {
    title: "Google OAuth: identificação e login",
    text: "Quando o usuário escolhe entrar ou conectar uma conta Google, podemos solicitar autorização OAuth para identificar a conta, validar o acesso e associar dados básicos de identificação, como nome, e-mail e imagem de perfil, quando fornecidos pelo Google. Essa autorização é usada para autenticação, segurança e identificação do usuário dentro da plataforma.",
  },
  {
    title: "Google OAuth: agenda e calendário",
    text: "Quando o usuário habilita recursos de agenda ou calendário, podemos solicitar autorização OAuth para acessar dados necessários à criação, leitura, atualização ou organização de eventos relacionados à operação comercial, compromissos, lembretes e atividades vinculadas ao atendimento. Esse acesso é usado somente para executar as funcionalidades autorizadas pelo usuário.",
  },
  {
    title: "Limitação de uso dos dados do Google",
    text: "Os dados obtidos por integrações Google são usados apenas para fornecer ou melhorar funcionalidades visíveis e autorizadas pelo usuário dentro do ShamarConnect. Não vendemos dados do Google, não usamos dados do Google para publicidade de terceiros e não usamos esses dados para treinar modelos de IA de terceiros.",
  },
  {
    title: "Revogação do acesso Google",
    text: "O usuário pode revogar permissões concedidas ao ShamarConnect nas configurações de segurança da própria conta Google. A revogação pode limitar ou interromper funcionalidades que dependam da integração Google.",
  },
  {
    title: "Segurança",
    text: "Adotamos medidas técnicas e organizacionais para proteger as informações contra acesso indevido, perda, alteração ou uso não autorizado. Nenhum sistema é absolutamente imune a riscos, mas buscamos reduzir exposições e manter práticas adequadas de proteção.",
  },
  {
    title: "Compartilhamento",
    text: "Dados podem ser compartilhados com provedores essenciais de infraestrutura, autenticação, hospedagem, comunicação, processamento, inteligência artificial e integrações necessárias para a execução do serviço contratado, sempre conforme a finalidade operacional.",
  },
  {
    title: "Direitos do usuário",
    text: "O usuário pode solicitar informações, correção, atualização, portabilidade ou exclusão de dados, conforme as regras aplicáveis e os limites legais, contratuais, técnicos e de segurança.",
  },
  {
    title: "Contato sobre privacidade",
    text: "Solicitações sobre privacidade, proteção de dados ou integrações Google OAuth devem ser encaminhadas aos canais oficiais da Moriah Systems Serviços Ltda, responsável pelo ShamarConnect.",
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
          Esta página explica como o ShamarConnect trata informações relacionadas ao uso da plataforma, incluindo integrações autorizadas com serviços de terceiros como Google OAuth.
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
