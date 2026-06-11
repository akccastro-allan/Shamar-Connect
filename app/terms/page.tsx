import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const sections = [
  {
    title: "1. Aceitação dos Termos",
    text: "Ao acessar, contratar ou utilizar o ShamarConnect, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso. Caso não concorde com qualquer condição, o usuário não deverá utilizar a plataforma.",
  },
  {
    title: "2. Sobre o ShamarConnect",
    text: "O ShamarConnect é uma plataforma SaaS desenvolvida pela Moriah Systems Serviços Ltda para apoiar empresas na organização do atendimento comercial via WhatsApp, CRM, funil de vendas, automações, integrações e recursos de inteligência artificial.",
  },
  {
    title: "3. Empresa responsável",
    text: "O serviço é fornecido pela Moriah Systems Serviços Ltda, CNPJ 66.912.118/0001-02, com atuação no Rio de Janeiro, RJ, Brasil. O contato oficial para suporte, dúvidas contratuais e solicitações relacionadas ao serviço é suporte@shamarconnect.com.br.",
  },
  {
    title: "4. Cadastro e acesso",
    text: "Para utilizar funcionalidades internas, o usuário poderá precisar criar uma conta, acessar por e-mail, senha, autenticação de terceiros ou outro método disponibilizado pela plataforma. O usuário é responsável por manter suas credenciais seguras e por todas as ações realizadas em sua conta.",
  },
  {
    title: "5. Uso permitido da plataforma",
    text: "O ShamarConnect deve ser utilizado para fins lícitos, comerciais e operacionais, respeitando a legislação aplicável, direitos de terceiros, normas de proteção de dados, regras de uso do WhatsApp e políticas dos provedores integrados.",
  },
  {
    title: "6. Uso proibido",
    text: "É proibido usar a plataforma para spam, fraudes, disparos abusivos, assédio, conteúdo ilegal, violação de privacidade, tentativa de invasão, engenharia reversa, uso indevido de APIs ou qualquer prática que prejudique clientes, terceiros, a plataforma ou seus provedores.",
  },
  {
    title: "7. Planos, cobrança e contratação",
    text: "O acesso ao ShamarConnect pode depender da contratação de planos pagos, módulos adicionais, implantação ou serviços complementares. Valores, recursos e limites podem variar conforme o plano contratado e poderão ser atualizados mediante comunicação ou publicação no site oficial.",
  },
  {
    title: "8. Módulo de Inteligência Artificial",
    text: "O Módulo IA é um recurso adicional que pode incluir sugestões de resposta, transcrição de áudio, resumo de conversas, classificação de intenção, detecção de urgência e pontuação de leads. As respostas geradas por IA são sugestões de apoio e devem ser revisadas pelo usuário antes de uso comercial.",
  },
  {
    title: "9. Integrações com terceiros",
    text: "A plataforma pode integrar serviços de terceiros, como WhatsApp, Google, Supabase, provedores de IA, hospedagem, e-mail, armazenamento e outros sistemas. A disponibilidade desses recursos pode depender das regras, limites, autorizações e estabilidade desses provedores.",
  },
  {
    title: "10. Google OAuth e dados de conta",
    text: "Quando o usuário optar por login ou integração com serviços Google, o ShamarConnect poderá solicitar permissões necessárias para autenticação e identificação da conta, conforme descrito na Política de Privacidade. O usuário pode revogar acessos diretamente em sua conta Google quando aplicável.",
  },
  {
    title: "11. Shamar Agent",
    text: "O Shamar Agent é um componente complementar destinado a integrações com sistemas locais do cliente, quando contratado. A instalação, configuração e disponibilidade podem depender do ambiente técnico do cliente, permissões, rede, sistema local e regras de segurança.",
  },
  {
    title: "12. Responsabilidades do cliente",
    text: "O cliente é responsável pelas informações cadastradas, mensagens enviadas, contatos importados, dados de clientes, permissões concedidas, uso de recursos de automação e cumprimento das leis aplicáveis à sua atividade, inclusive normas de proteção de dados e comunicação comercial.",
  },
  {
    title: "13. Disponibilidade do serviço",
    text: "A Moriah Systems busca manter a plataforma disponível e estável, mas não garante funcionamento ininterrupto. Manutenções, falhas de terceiros, instabilidades de rede, atualizações, incidentes técnicos ou bloqueios de provedores podem afetar temporariamente o serviço.",
  },
  {
    title: "14. Suporte",
    text: "O suporte será prestado conforme o plano contratado e pelos canais informados oficialmente. O contato principal de suporte é suporte@shamarconnect.com.br. Solicitações podem exigir dados técnicos, identificação da conta e informações sobre o problema relatado.",
  },
  {
    title: "15. Proteção de dados",
    text: "O tratamento de dados pessoais no ShamarConnect segue a Política de Privacidade publicada no site. O usuário declara possuir base legal e autorização adequada para cadastrar, importar ou tratar dados de clientes, leads, contatos e colaboradores na plataforma.",
  },
  {
    title: "16. Propriedade intelectual",
    text: "A marca ShamarConnect, identidade visual, códigos, interfaces, fluxos, textos, documentação, estrutura da plataforma e demais elementos são de titularidade da Moriah Systems ou de seus licenciantes. O uso da plataforma não transfere propriedade intelectual ao cliente.",
  },
  {
    title: "17. Limitação de responsabilidade",
    text: "A Moriah Systems não se responsabiliza por perdas decorrentes de mau uso, decisões comerciais tomadas pelo cliente, indisponibilidade de terceiros, bloqueios de conta em provedores externos, mensagens enviadas indevidamente, dados incorretos ou falhas fora do controle razoável da plataforma.",
  },
  {
    title: "18. Cancelamento e suspensão",
    text: "O acesso poderá ser suspenso ou cancelado em caso de inadimplência, violação destes Termos, uso abusivo, risco de segurança, solicitação do cliente ou encerramento da contratação. Dados poderão ser retidos ou excluídos conforme a Política de Privacidade e obrigações legais.",
  },
  {
    title: "19. Alterações nos Termos",
    text: "Estes Termos podem ser atualizados para refletir mudanças legais, técnicas, comerciais ou operacionais. A versão vigente será publicada no site oficial. O uso contínuo da plataforma após alterações representa concordância com a nova versão.",
  },
  {
    title: "20. Foro",
    text: "Fica eleito o foro da Comarca do Rio de Janeiro, RJ, para dirimir eventuais controvérsias relacionadas a estes Termos, salvo quando a legislação aplicável determinar foro diverso.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56">
            <BrandLogo className="h-auto w-full" />
          </Link>
          <Link
            href="/planos"
            className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white"
          >
            Ver planos
          </Link>
        </div>
      </header>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
            ShamarConnect
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Termos de Uso
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Estes Termos regulam o acesso e uso do ShamarConnect, plataforma de atendimento comercial, CRM, WhatsApp, automações, integrações e recursos de inteligência artificial fornecida pela Moriah Systems Serviços Ltda.
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
