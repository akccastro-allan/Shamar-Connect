import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const sections = [
  {
    title: "1. Quem somos",
    text: "O ShamarConnect é fornecido pela Moriah Systems Serviços Ltda, CNPJ 66.912.118/0001-02. Somos responsáveis por esta Política de Privacidade e pelo tratamento dos dados pessoais realizados na plataforma, conforme a Lei Geral de Proteção de Dados (LGPD).",
  },
  {
    title: "2. Dados que podemos coletar",
    text: "Podemos coletar nome, e-mail, telefone, empresa, cargo, dados de login, dados de uso, informações técnicas do dispositivo, registros de acesso, dados de contatos comerciais cadastrados pelo usuário, conversas, histórico de atendimento, oportunidades comerciais e configurações da conta.",
  },
  {
    title: "3. Dados de login com Google OAuth",
    text: "Quando o usuário utiliza login ou integração com Google, podemos receber dados básicos de identificação autorizados pelo próprio usuário, como nome, e-mail, identificador da conta e imagem de perfil, quando disponibilizada. Esses dados são usados para autenticação, identificação da conta e segurança de acesso.",
  },
  {
    title: "4. Uso de dados obtidos de APIs do Google",
    text: "O ShamarConnect utiliza dados recebidos de APIs do Google somente para fornecer ou melhorar funcionalidades autorizadas pelo usuário. Não vendemos dados do Google, não usamos esses dados para publicidade e não transferimos dados do Google para terceiros, exceto quando necessário para fornecer o serviço, cumprir obrigações legais ou com autorização do usuário.",
  },
  {
    title: "5. Tokens e permissões",
    text: "Quando houver autorização por OAuth, tokens de acesso ou atualização poderão ser armazenados de forma segura para manter a sessão ou integração autorizada. O usuário pode revogar permissões nas configurações da conta Google ou solicitar a remoção pelo e-mail suporte@shamarconnect.com.br.",
  },
  {
    title: "6. Finalidades do tratamento",
    text: "Usamos dados para criar e gerenciar contas, autenticar usuários, prestar o serviço contratado, organizar atendimento e CRM, registrar histórico, operar integrações, gerar relatórios, melhorar a plataforma, oferecer suporte, prevenir fraudes, cumprir obrigações legais e comunicar informações importantes sobre o serviço.",
  },
  {
    title: "7. WhatsApp, CRM e contatos",
    text: "Dados de contatos, leads, clientes e conversas inseridos pelo cliente são usados para viabilizar atendimento, organização comercial, histórico, funil de vendas, respostas rápidas, relatórios e automações. O cliente é responsável por possuir autorização ou base legal adequada para cadastrar e tratar esses dados na plataforma.",
  },
  {
    title: "8. Inteligência Artificial",
    text: "Quando o Módulo IA é utilizado, trechos de conversas, áudios transcritos ou dados necessários à funcionalidade podem ser processados para gerar sugestões de resposta, resumo, classificação de intenção, detecção de urgência ou pontuação de lead. As respostas geradas são apoio ao usuário e devem ser revisadas antes do envio.",
  },
  {
    title: "9. Compartilhamento de dados",
    text: "Podemos compartilhar dados com provedores essenciais para operação da plataforma, como hospedagem, banco de dados, autenticação, e-mail, armazenamento, processamento de IA, monitoramento e suporte técnico. Esses provedores atuam para viabilizar o serviço e devem observar medidas de segurança e confidencialidade.",
  },
  {
    title: "10. Não venda de dados",
    text: "A Moriah Systems não vende dados pessoais, dados de clientes, dados de contatos comerciais ou dados obtidos por integrações Google. Também não utiliza dados de usuários para publicidade comportamental de terceiros.",
  },
  {
    title: "11. Segurança",
    text: "Adotamos medidas técnicas e organizacionais para proteger dados contra acesso não autorizado, perda, alteração, divulgação indevida ou uso inadequado. Nenhum sistema é totalmente imune a riscos, mas buscamos operar com práticas razoáveis de segurança, controle de acesso e proteção de credenciais.",
  },
  {
    title: "12. Retenção de dados",
    text: "Mantemos dados pelo tempo necessário para prestar o serviço, cumprir obrigações legais, resolver disputas, manter segurança, prevenir fraudes e atender solicitações do usuário. Dados podem ser excluídos ou anonimizados quando não forem mais necessários ou mediante solicitação aplicável.",
  },
  {
    title: "13. Direitos dos titulares",
    text: "Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revisão de decisões automatizadas, revogação de consentimento e oposição quando aplicável.",
  },
  {
    title: "14. Exclusão de dados e encerramento",
    text: "O usuário ou cliente pode solicitar exclusão de conta ou dados pelo e-mail suporte@shamarconnect.com.br. Algumas informações poderão ser mantidas quando necessário para cumprimento legal, auditoria, segurança, prevenção de fraude ou defesa em processos administrativos e judiciais.",
  },
  {
    title: "15. Cookies e dados técnicos",
    text: "Podemos usar cookies, armazenamento local e tecnologias semelhantes para manter sessão, autenticação, preferências, segurança e análise de uso. O usuário pode controlar cookies no navegador, mas a desativação pode afetar funcionalidades da plataforma.",
  },
  {
    title: "16. Transferência internacional",
    text: "Alguns provedores usados pela plataforma podem processar ou armazenar dados fora do Brasil. Quando isso ocorrer, buscamos utilizar fornecedores reconhecidos e medidas compatíveis com proteção de dados e segurança da informação.",
  },
  {
    title: "17. Crianças e adolescentes",
    text: "O ShamarConnect é destinado a uso empresarial e não é direcionado a crianças ou adolescentes. Caso identifiquemos tratamento inadequado de dados de menores, poderemos remover as informações conforme a legislação aplicável.",
  },
  {
    title: "18. Alterações nesta Política",
    text: "Esta Política de Privacidade pode ser atualizada para refletir mudanças legais, técnicas, operacionais ou comerciais. A versão vigente estará disponível no site oficial shamarconnect.com.br/privacy.",
  },
  {
    title: "19. Contato e encarregado",
    text: "Para dúvidas, solicitações de privacidade, revogação de permissões, exclusão de dados ou exercício de direitos, entre em contato pelo e-mail suporte@shamarconnect.com.br.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56">
            <BrandLogo className="h-auto w-full" />
          </Link>
          <Link
            href="/terms"
            className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white"
          >
            Termos de Uso
          </Link>
        </div>
      </header>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            ShamarConnect
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Política de Privacidade
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Esta Política explica como a Moriah Systems coleta, usa, armazena, compartilha e protege dados pessoais no ShamarConnect, incluindo dados relacionados a autenticação, Google OAuth, WhatsApp, CRM, automações e recursos de inteligência artificial.
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Última atualização: junho de 2026
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14 md:px-8">
        <div className="space-y-5">
          {sections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#1B2F5B]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
