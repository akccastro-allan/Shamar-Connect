import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como registrar o histórico de clientes que vieram pelo WhatsApp",
  description: "Clientes que chegam pelo WhatsApp raramente entram em um CRM. Veja por que isso é um erro caro e como criar uma rotina simples para registrar o histórico desde o primeiro contato.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Organização</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como registrar o histórico de clientes que vieram pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Quando o histórico fica só no WhatsApp, ele está no aparelho — não na empresa. Qualquer mudança de atendente ou troca de celular e o histórico some.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 6 min • Categoria: Organização • Palavra-chave: histórico cliente WhatsApp CRM
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>O WhatsApp é excelente para comunicação. Péssimo para armazenar histórico de clientes. As conversas ficam no aparelho de quem atendeu, sem busca eficiente, sem estrutura, sem acesso para outros membros da equipe.</p>
          <p>Empresas que dependem só do WhatsApp para guardar o histórico de clientes operam com um risco silencioso: a saída de um atendente, a troca de um celular ou a simples exclusão de uma conversa apaga histórico que pode valer muito.</p>

          <h2>Por que o histórico no WhatsApp não é suficiente?</h2>
          <p>Primeiro, acesso. O histórico fica restrito ao aparelho ou à conta de quem atendeu — não está disponível para o resto da equipe. Segundo, busca. Encontrar uma conversa antiga no WhatsApp exige lembrar o nome do contato e rolar manualmente. Terceiro, estrutura. O WhatsApp não registra data de fechamento, valor da venda, próxima ação ou qualquer metadado além da mensagem em si.</p>

          <h2>O que deve ser registrado no histórico de um cliente?</h2>
          <p>Informações básicas: nome, empresa, telefone, como chegou (indicação, grupo, anúncio). Histórico de compras: o que comprou, quando, qual valor, como pagou. Histórico de atendimento: principais contatos, problemas relatados, soluções aplicadas. Próximas ações: o que está pendente e quem é responsável.</p>

          <h2>Como criar a rotina de registro sem travar o atendimento?</h2>
          <p>O maior erro é tentar registrar tudo. Isso cria resistência na equipe. Comece com o mínimo: nome, telefone e origem do cliente ao primeiro contato. Adicione notas quando surgir informação relevante. Com o tempo, o registro vira hábito e o histórico cresce naturalmente.</p>
          <p>Integrar o CRM ao canal de atendimento elimina parte do esforço: o histórico de conversas já está lá, e o atendente só precisa adicionar as informações contextuais que o sistema não captura automaticamente.</p>

          <h2>Como o histórico ajuda a vender mais para quem já é cliente?</h2>
          <p>Cliente que já comprou é o cliente mais fácil de vender novamente. Com histórico registrado, é possível identificar quem comprou um produto específico e ofertar um complementar, quem ficou satisfeito e pode indicar outros, ou quem comprou há seis meses e pode precisar de uma reposição.</p>

          <h2>Conclusão</h2>
          <p>Histórico de cliente é um ativo da empresa — não de um atendente. Registrá-lo de forma centralizada e acessível protege esse ativo e abre oportunidades de vendas que a maioria das empresas deixa passar por falta de organização.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer centralizar o histórico de todos os seus clientes?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect integra WhatsApp e CRM para que o histórico de cada cliente fique na empresa, não no aparelho.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
