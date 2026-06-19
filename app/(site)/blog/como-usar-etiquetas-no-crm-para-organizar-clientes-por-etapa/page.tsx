import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como usar etiquetas no CRM para organizar clientes por etapa de venda",
  description:
    "Etiquetas no CRM são uma forma poderosa de categorizar clientes — se usadas com consistência. Veja como criar um sistema simples que a equipe realmente segue.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">
          ← Voltar para o blog
        </Link>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
          CRM
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como usar etiquetas no CRM para organizar clientes por etapa de venda
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Etiquetas são uma das ferramentas mais simples de um CRM — e uma das mais mal usadas. Quando bem definidas e aplicadas com consistência, elas transformam uma lista caótica de contatos num sistema navegável que sua equipe realmente usa.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min · Categoria: CRM · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>Etiquetas (ou tags) são marcadores que você atribui a clientes ou conversas para classificá-los de forma rápida. Em vez de lembrar ou procurar em qual etapa cada cliente está, você filtra pela etiqueta e vê todos de uma vez.</p>

          <p>O problema é que a maioria das empresas cria etiquetas demais, sem padrão, e sem comunicar o significado para a equipe. O resultado: 15 etiquetas diferentes que significam coisas parecidas, cada atendente usando as suas preferidas, e um sistema que virou um caos ainda maior do que a lista original.</p>

          <p>O antídoto não é eliminar etiquetas — é criar um sistema intencionalmente simples.</p>

          <h2>Para que servem etiquetas num CRM de vendas pelo WhatsApp?</h2>

          <p>Etiquetas servem para responder perguntas rápidas sobre um grupo de clientes. "Quem está esperando proposta?" "Quais clientes são recorrentes?" "Quem indicou alguém nos últimos 3 meses?" "Quem precisa de follow-up urgente?"</p>

          <p>Sem etiquetas, responder essas perguntas exige rolar manualmente por centenas de contatos. Com etiquetas bem aplicadas, você filtra e tem a resposta em segundos.</p>

          <h2>Quais categorias de etiquetas fazem sentido?</h2>

          <p>Existem três categorias que cobrem a maioria das necessidades de um time de vendas pelo WhatsApp:</p>

          <p><strong>Etiquetas de etapa comercial:</strong> onde o cliente está no processo de venda. Exemplos: <em>Novo</em>, <em>Qualificado</em>, <em>Proposta enviada</em>, <em>Em negociação</em>, <em>Fechado</em>, <em>Perdido</em>.</p>

          <p><strong>Etiquetas de perfil:</strong> características do cliente que informam a abordagem. Exemplos: <em>Pessoa física</em>, <em>Empresa</em>, <em>Cliente recorrente</em>, <em>Indicação</em>, <em>Alto valor</em>.</p>

          <p><strong>Etiquetas de ação pendente:</strong> algo que precisa ser feito com esse cliente. Exemplos: <em>Follow-up pendente</em>, <em>Aguardando documento</em>, <em>Verificar pagamento</em>.</p>

          <p>Para começar, implemente apenas a categoria de etapa comercial. Ela tem o impacto mais direto na gestão do funil e é a mais fácil de adotar.</p>

          <h2>Por que etiquetas sem padrão viram problema?</h2>

          <p>Imagine que três atendentes diferentes usam etiquetas para o mesmo tipo de situação:</p>
          <ul>
            <li>Atendente A cria: <em>Lead quente</em></li>
            <li>Atendente B cria: <em>Interessado</em></li>
            <li>Atendente C cria: <em>Hot lead</em></li>
          </ul>

          <p>As três etiquetas significam a mesma coisa — mas o gestor que filtra por "Lead quente" vai ver só os clientes do Atendente A. Os do B e do C são invisíveis nesse filtro.</p>

          <p>Isso gera decisões baseadas em dados incompletos, relatórios incorretos, e ações que deveriam ser para todos os "leads quentes" chegando apenas em parte deles.</p>

          <h2>Como definir as etiquetas da equipe de forma que todos usem?</h2>

          <p>O processo tem três passos:</p>

          <p><strong>1. Liste as situações que você precisa identificar rapidamente.</strong> Não pense em etiquetas ainda — pense em perguntas. "Preciso saber quem está esperando proposta" vira a etiqueta <em>Proposta enviada</em>.</p>

          <p><strong>2. Documente o significado exato de cada etiqueta.</strong> Não apenas o nome — o critério de aplicação. "A etiqueta 'Qualificado' é aplicada quando o cliente confirmou que tem orçamento e prazo definidos." Sem critério, cada atendente vai interpretar diferente.</p>

          <p><strong>3. Revise periodicamente e elimine etiquetas não usadas.</strong> Todo sistema de etiquetas acumula lixo com o tempo — etiquetas criadas para uma situação pontual que nunca foram removidas. Uma revisão trimestral mantém o sistema limpo.</p>

          <h2>Etiquetas vs. colunas do Kanban: qual usar e quando?</h2>

          <p>As duas ferramentas se complementam — não competem.</p>

          <p><strong>Colunas do Kanban</strong> mostram onde o cliente está no funil. Um cliente só pode estar numa coluna por vez. É a visão principal do processo de venda.</p>

          <p><strong>Etiquetas</strong> adicionam camadas de contexto. Um cliente pode ter várias etiquetas ao mesmo tempo — está na coluna "Em negociação" (Kanban) e tem as etiquetas "Cliente recorrente" e "Follow-up pendente" (etiquetas).</p>

          <p>O Kanban diz "onde está". As etiquetas dizem "quem é" e "o que precisa". Juntos, oferecem uma visão muito mais completa do que qualquer um isolado.</p>

          <h2>Como usar etiquetas para agir em grupos de clientes?</h2>

          <p>O maior valor das etiquetas aparece quando você age sobre um grupo, não sobre um cliente individual. Exemplos práticos:</p>

          <ul>
            <li>Filtrar todos os clientes com etiqueta <em>Proposta enviada</em> há mais de 5 dias → fazer follow-up em lote.</li>
            <li>Filtrar todos os <em>Clientes recorrentes</em> que não compraram nos últimos 60 dias → campanha de reativação.</li>
            <li>Filtrar todas as <em>Indicações</em> → enviar agradecimento personalizado.</li>
          </ul>

          <p>Essas ações em grupo são impossíveis sem etiquetas consistentes. Com elas, o que seria um processo manual de horas vira uma ação direcionada em minutos.</p>

          <h2>Conclusão</h2>

          <p>Etiquetas bem definidas e consistentemente aplicadas são uma das ferramentas mais simples e mais poderosas de um CRM. O investimento inicial — definir o sistema, documentar o significado, treinar a equipe — é pequeno. O retorno em clareza e capacidade de ação é grande e cumulativo.</p>

          <p>Comece com 5 etiquetas de etapa comercial. Garanta que toda a equipe usa as mesmas. Revise a cada trimestre. Esse ciclo simples cria um sistema que melhora com o tempo.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer organizar seu pipeline de vendas com etiquetas e Kanban?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect oferece CRM com etiquetas, Kanban e histórico integrado ao WhatsApp — para que sua equipe saiba exatamente onde está cada cliente a qualquer momento.
          </p>
          <Link
            href="/planos"
            className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white hover:bg-[#24a897] transition-colors"
          >
            Conhecer o ShamarConnect
          </Link>
        </div>
      </article>
    </main>
  );
}
