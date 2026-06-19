import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O que é CRM Kanban e como funciona para quem vende pelo WhatsApp",
  description: "CRM Kanban organiza oportunidades em colunas visuais por etapa de venda. Veja como funciona na prática para equipes comerciais que atendem pelo WhatsApp.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">CRM</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          O que é CRM Kanban e como funciona para quem vende pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Kanban é a forma mais visual e intuitiva de acompanhar onde está cada oportunidade de venda — e funciona muito bem para equipes que operam pelo WhatsApp.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: CRM • Palavra-chave: CRM Kanban WhatsApp
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>O Kanban nasceu na indústria japonesa para organizar fluxos de trabalho de forma visual. Nos últimos anos, virou padrão em equipes de tecnologia e vendas porque simplifica algo complexo: ver o estado de múltiplas oportunidades ao mesmo tempo.</p>
          <p>Para quem vende pelo WhatsApp, onde dezenas de conversas acontecem em paralelo, o CRM Kanban oferece uma visão que a lista de mensagens do WhatsApp nunca vai dar.</p>

          <h2>Como funciona um CRM Kanban na prática?</h2>
          <p>No Kanban de vendas, cada coluna representa uma etapa do processo comercial. Exemplos comuns: Novo contato, Orçamento enviado, Em negociação, Proposta aceita, Fechado. Cada cliente é um cartão que se move entre as colunas conforme a negociação avança.</p>
          <p>Com isso, o gestor abre o painel e em segundos vê: quantas oportunidades estão em cada etapa, qual está parada há mais tempo e onde está o gargalo do processo.</p>

          <h2>Por que o Kanban funciona para vendas pelo WhatsApp?</h2>
          <p>O WhatsApp mostra conversas em ordem cronológica de última mensagem. Isso significa que um cliente com proposta enviada há três dias, mas sem resposta, some no meio de dezenas de outras conversas. O Kanban coloca esse cliente em evidência — ele está na coluna "Proposta enviada" e está parado há três dias. Impossível ignorar.</p>

          <h2>Quais etapas colocar no Kanban?</h2>
          <p>Não existe um modelo universal. O Kanban deve refletir o processo real da empresa. Para pequenos negócios, quatro a cinco colunas já é suficiente. Para negócios com ciclo de venda mais longo, pode ser necessário mais etapas para identificar onde estão os gargalos.</p>
          <p>Uma boa forma de definir as colunas é mapear o que acontece com um cliente desde o primeiro contato até o fechamento e criar uma coluna para cada etapa que requer uma ação específica da equipe.</p>

          <h2>Como o Kanban ajuda o gestor a tomar decisões?</h2>
          <p>Com o Kanban, o gestor vê em tempo real onde estão concentradas as oportunidades. Se muitos clientes estão presos na etapa de orçamento, talvez o processo de precificação esteja gerando fricção. Se a coluna de fechamento está vazia, talvez falte follow-up na etapa anterior.</p>
          <p>Essa visão transforma o feeling em dado — e dado embase decisões muito mais precisas do que intuição.</p>

          <h2>CRM Kanban é para qualquer tamanho de empresa?</h2>
          <p>Sim. Empresas com dois vendedores se beneficiam do Kanban tanto quanto empresas com vinte. O critério não é o tamanho — é o volume de oportunidades simultâneas. A partir do momento que é difícil lembrar de todas as negociações em andamento, o Kanban passa a ser necessário.</p>

          <h2>Conclusão</h2>
          <p>CRM Kanban é a ferramenta mais acessível para dar visibilidade ao processo de vendas. Para equipes que operam pelo WhatsApp, ele transforma a confusão de dezenas de conversas paralelas em um painel claro de onde está cada oportunidade e qual é a próxima ação.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer visualizar seu funil de vendas no WhatsApp?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect inclui CRM Kanban integrado ao atendimento, com histórico de conversas e próximas ações por cliente.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
