import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/site/site-footer";

const sections = [
  {
    title: "1. Objetivo desta política",
    text: "Esta Política de Cancelamento e Reembolso explica como funcionam solicitações de arrependimento, cancelamento, suspensão, reembolso e encerramento de serviços do ShamarConnect, fornecido pela Moriah Systems Serviços Ltda, CNPJ 66.912.118/0001-02.",
  },
  {
    title: "2. Direito de arrependimento em contratação online",
    text: "Quando a contratação ocorrer pela internet ou fora de estabelecimento comercial, o consumidor poderá exercer o direito de arrependimento no prazo de 7 dias corridos a partir da contratação, conforme o Código de Defesa do Consumidor. A solicitação deve ser enviada para suporte@shamarconnect.com.br.",
  },
  {
    title: "3. Como solicitar cancelamento ou reembolso",
    text: "A solicitação deve informar nome do contratante, e-mail da conta, empresa vinculada, plano contratado, data da contratação, comprovante ou referência da cobrança e motivo da solicitação. A Moriah Systems poderá solicitar dados adicionais para validar a titularidade e evitar fraudes.",
  },
  {
    title: "4. Reembolso dentro do prazo legal",
    text: "Solicitações elegíveis realizadas dentro do prazo legal serão analisadas e processadas conforme a legislação aplicável e o meio de pagamento utilizado. O prazo de devolução pode depender do Asaas, banco emissor, operadora de cartão ou instituição financeira envolvida.",
  },
  {
    title: "5. Serviços de implantação e customização",
    text: "Taxas de implantação, configuração personalizada, treinamento, importação de dados, integração local, customização, consultoria ou desenvolvimento sob demanda podem ter tratamento específico quando já executados, desde que essa condição tenha sido informada antes da contratação e respeite a legislação aplicável.",
  },
  {
    title: "6. Cancelamento após 7 dias",
    text: "Após o prazo legal de arrependimento, o cliente pode solicitar cancelamento da renovação futura. Em regra, o acesso permanece ativo até o fim do ciclo pago e não há reembolso proporcional automático, salvo obrigação legal, falha comprovada na prestação do serviço ou decisão comercial formalizada.",
  },
  {
    title: "7. Inadimplência",
    text: "Pagamentos em atraso podem gerar aviso, restrição de funcionalidades, suspensão de integrações, bloqueio de acesso ou cancelamento da assinatura. A reativação poderá depender da quitação dos valores em aberto e confirmação pelo provedor financeiro.",
  },
  {
    title: "8. Preservação e exportação de dados",
    text: "Após cancelamento, a Moriah Systems poderá manter dados pelo prazo necessário para cumprimento de obrigações legais, exercício regular de direitos, segurança, prevenção a fraudes, auditoria e suporte. Quando aplicável, o cliente poderá solicitar exportação ou exclusão de dados.",
  },
  {
    title: "9. Contato",
    text: "Dúvidas, solicitações de cancelamento, reembolso e assuntos financeiros devem ser enviados para suporte@shamarconnect.com.br.",
  },
];

export default function CancellationRefundPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="block w-44 md:w-56">
            <BrandLogo className="h-auto w-full" />
          </Link>
          <Link href="/planos" className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white">
            Ver planos
          </Link>
        </div>
      </header>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">ShamarConnect</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Cancelamento e Reembolso
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Regras comerciais para arrependimento, cancelamento, reembolso, implantação, inadimplência e encerramento de assinatura.
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-500">Última atualização: junho de 2026</p>
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
