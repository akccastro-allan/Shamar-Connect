import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const sections = [
  {
    title: "1. Quem somos",
    text: "O ShamarConnect é fornecido pela Moriah Systems Serviços Ltda, CNPJ 66.912.118/0001-02. Somos responsáveis por esta Política de Privacidade e pelo tratamento de dados pessoais realizado na plataforma ShamarConnect, conforme a Lei Geral de Proteção de Dados (LGPD).",
  },
  {
    title: "2. Finalidade da plataforma",
    text: "O ShamarConnect é uma plataforma empresarial para atendimento comercial, CRM, organização de conversas, histórico de WhatsApp, funil de vendas, respostas rápidas, relatórios, integrações e recursos de inteligência artificial voltados ao uso operacional de empresas clientes.",
  },
  {
    title: "3. Dados que podemos coletar",
    text: "Podemos coletar nome, e-mail, telefone, empresa, cargo, dados de login, dados de uso, informações técnicas do dispositivo, registros de acesso, dados de contatos comerciais cadastrados pelo usuário, conversas, histórico de atendimento, oportunidades comerciais, configurações da conta e informações necessárias para prestação do serviço contratado.",
  },
  {
    title: "4. Login com Google OAuth",
    text: "Quando o usuário escolhe entrar com Google, o ShamarConnect pode solicitar e receber dados básicos autorizados pelo usuário, como nome, endereço de e-mail, identificador da conta Google e imagem de perfil, quando disponibilizada. Esses dados são usados exclusivamente para autenticação, identificação do usuário autorizado, segurança de acesso e vinculação do usuário à empresa cadastrada no ShamarConnect.",
  },
  {
    title: "5. Escopos e permissões do Google",
    text: "O ShamarConnect solicita apenas permissões necessárias para autenticação e identificação do usuário. A plataforma não solicita permissões de Gmail, Google Drive, Google Agenda, contatos ou outros dados sensíveis do Google, salvo se uma funcionalidade específica for contratada e previamente informada ao usuário por meio desta Política ou aviso específico dentro do produto.",
  },
  {
    title: "6. Uso de dados obtidos por APIs do Google",
    text: "Os dados obtidos por APIs do Google são usados somente para fornecer ou melhorar funcionalidades visíveis e autorizadas pelo usuário no ShamarConnect. Não utilizamos dados do Google para publicidade, retargeting, venda de dados, análise de crédito, vigilância, criação de perfis para terceiros ou qualquer finalidade incompatível com a autenticação e operação da conta do usuário.",
  },
  {
    title: "7. Uso limitado de dados do Google",
    text: "O uso de dados recebidos de APIs do Google pelo ShamarConnect observa o princípio de uso limitado: os dados são tratados apenas para autenticação, segurança, suporte à conta e prestação do serviço solicitado pelo usuário. Não transferimos dados do Google a terceiros, exceto quando necessário para operar a infraestrutura do serviço, cumprir obrigação legal, proteger a segurança da plataforma ou mediante consentimento explícito do usuário.",
  },
  {
    title: "8. Tokens, sessão e revogação de permissões",
    text: "Quando houver autorização por OAuth, tokens de acesso ou dados de sessão poderão ser armazenados de forma segura pelo tempo necessário para manter o acesso autorizado. O usuário pode revogar o acesso do ShamarConnect nas configurações da própria conta Google ou solicitar a remoção pelo e-mail suporte@shamarconnect.com.br.",
  },
  {
    title: "9. Finalidades gerais do tratamento",
    text: "Usamos dados para criar e gerenciar contas, autenticar usuários, verificar autorização de acesso, prestar o serviço contratado, organizar atendimento e CRM, registrar histórico, operar integrações, gerar relatórios, melhorar a plataforma, oferecer suporte, prevenir fraudes, cumprir obrigações legais e comunicar informações importantes sobre o serviço.",
  },
  {
    title: "10. WhatsApp, CRM e contatos comerciais",
    text: "Dados de contatos, leads, clientes e conversas inseridos pelo cliente são usados para viabilizar atendimento, organização comercial, histórico, funil de vendas, respostas rápidas, relatórios e automações. O cliente é responsável por possuir autorização, base legal ou relação legítima adequada para cadastrar e tratar esses dados na plataforma.",
  },
  {
    title: "11. Mensagens, mídias e histórico permanente",
    text: "Quando contratado, o ShamarConnect pode armazenar histórico de mensagens, anexos, áudios, vídeos, documentos, imagens, stickers, localizações, contatos compartilhados e eventos de mensagem apagada. Esse armazenamento tem a finalidade de preservar histórico comercial, auditoria operacional, continuidade do atendimento e organização do relacionamento com clientes.",
  },
  {
    title: "12. Inteligência Artificial",
    text: "Quando o Módulo IA é utilizado, trechos de conversas, áudios transcritos ou dados necessários à funcionalidade podem ser processados para gerar sugestões de resposta, resumo, classificação de intenção, detecção de urgência ou pontuação de lead. As respostas geradas são apoio ao usuário e devem ser revisadas antes do envio ou uso comercial.",
  },
  {
    title: "13. Compartilhamento de dados",
    text: "Podemos compartilhar dados com provedores essenciais para operação da plataforma, como hospedagem, banco de dados, autenticação, e-mail, armazenamento, processamento de IA, monitoramento, segurança e suporte técnico. Esses provedores atuam para viabilizar o serviço e devem observar medidas de segurança e confidencialidade.",
  },
  {
    title: "14. Não venda de dados",
    text: "A Moriah Systems não vende dados pessoais, dados de clientes, dados de contatos comerciais, dados de conversas ou dados obtidos por integrações Google. Também não utiliza dados de usuários para publicidade comportamental de terceiros.",
  },
  {
    title: "15. Segurança",
    text: "Adotamos medidas técnicas e organizacionais para proteger dados contra acesso não autorizado, perda, alteração, divulgação indevida ou uso inadequado. Isso inclui controle de acesso, autenticação, uso de provedores reconhecidos, segregação por empresa e proteção de credenciais. Nenhum sistema é totalmente imune a riscos, mas buscamos operar com práticas razoáveis de segurança.",
  },
  {
    title: "16. Retenção de dados",
    text: "Mantemos dados pelo tempo necessário para prestar o serviço, cumprir obrigações legais, resolver disputas, manter segurança, prevenir fraudes e atender solicitações do usuário. Dados podem ser excluídos ou anonimizados quando não forem mais necessários ou mediante solicitação aplicável.",
  },
  {
    title: "17. Exclusão de dados",
    text: "O usuário ou cliente pode solicitar exclusão de conta, dados pessoais ou dados vinculados ao Google OAuth pelo e-mail suporte@shamarconnect.com.br. Algumas informações poderão ser mantidas quando necessário para cumprimento legal, auditoria, segurança, prevenção de fraude ou defesa em processos administrativos e judiciais.",
  },
  {
    title: "18. Direitos dos titulares",
    text: "Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revisão de decisões automatizadas, revogação de consentimento e oposição quando aplicável.",
  },
  {
    title: "19. Cookies e dados técnicos",
    text: "Podemos usar cookies, armazenamento local e tecnologias semelhantes para manter sessão, autenticação, preferências, segurança e análise de uso. O usuário pode controlar cookies no navegador, mas a desativação pode afetar funcionalidades da plataforma.",
  },
  {
    title: "20. Transferência internacional",
    text: "Alguns provedores usados pela plataforma podem processar ou armazenar dados fora do Brasil. Quando isso ocorrer, buscamos utilizar fornecedores reconhecidos e medidas compatíveis com proteção de dados e segurança da informação.",
  },
  {
    title: "21. Crianças e adolescentes",
    text: "O ShamarConnect é destinado a uso empresarial e não é direcionado a crianças ou adolescentes. A plataforma não deve ser usada por menores de idade. Caso identifiquemos tratamento inadequado de dados de menores, poderemos remover as informações conforme a legislação aplicável.",
  },
  {
    title: "22. Alterações nesta Política",
    text: "Esta Política de Privacidade pode ser atualizada para refletir mudanças legais, técnicas, operacionais ou comerciais. Se alterarmos a forma como usamos dados do Google ou outros dados pessoais de maneira relevante, poderemos solicitar novo consentimento ou publicar aviso claro antes da nova utilização.",
  },
  {
    title: "23. Contato e encarregado",
    text: "Para dúvidas, solicitações de privacidade, revogação de permissões, exclusão de dados ou exercício de direitos, entre em contato pelo e-mail suporte@shamarconnect.com.br. A versão vigente desta Política está disponível em https://shamarconnect.com.br/privacy.",
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
