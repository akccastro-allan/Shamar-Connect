import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O que é CRM Kanban e como ele ajuda quem vende pelo WhatsApp",
  description:
    "CRM Kanban organiza oportunidades em colunas visuais por etapa de venda. Para quem gerencia dezenas de conversas no WhatsApp ao mesmo tempo, essa visão muda tudo.",
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
          O que é CRM Kanban e como ele ajuda quem vende pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          A lista de conversas do WhatsApp mostra quem falou por último — não quem está mais próximo de fechar, quem está esperando resposta há 3 dias, ou onde estão as 5 maiores oportunidades do mês. O CRM Kanban foi feito exatamente para dar essa visão.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 8 min · Categoria: CRM · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>Se você gerencia vendas pelo WhatsApp sem nenhum sistema, você sabe o que acontece: a lista de conversas é uma sequência caótica ordenada pelo último que mandou mensagem. Quem está prestes a fechar, quem está numa objeção difícil, quem nunca vai comprar — tudo misturado, sem hierarquia, sem visibilidade.</p>

          <p>O CRM Kanban resolve esse problema de forma visual e intuitiva. É a ferramenta que transforma a confusão de conversas simultâneas num painel claro onde você vê, de relance, o estado de cada oportunidade.</p>

          <h2>O que é Kanban? A origem do método</h2>

          <p>Kanban nasceu no Japão nos anos 1950, dentro das fábricas da Toyota. O princípio era simples: usar cartões visuais para controlar o fluxo de produção — o que está sendo feito, o que está parado, o que está bloqueado.</p>

          <p>Nas últimas décadas, o método foi adaptado para gestão de projetos e, mais recentemente, para vendas. A lógica é a mesma: um quadro com colunas representando etapas, e cartões (clientes) que se movem entre as colunas conforme a negociação avança.</p>

          <h2>Como um CRM Kanban funciona na prática para vendas?</h2>

          <p>Imagine um quadro com 5 colunas: <em>Novo contato → Qualificado → Proposta enviada → Em negociação → Fechado</em>. Cada cliente é um cartão com seu nome, o valor da oportunidade, e a data do último contato.</p>

          <p>Você abre o painel pela manhã e em 30 segundos vê: 3 clientes na fase de proposta enviada — dois estão parados há 5 dias (precisam de follow-up), um acabou de receber ontem. 2 clientes em negociação ativa. 1 cliente pronto para fechar mas aguardando aprovação interna.</p>

          <p>Isso é impossível de enxergar na lista do WhatsApp. Com o Kanban, é a primeira coisa que você vê quando abre o dia.</p>

          <h2>Por que o Kanban funciona especialmente bem para vendas pelo WhatsApp?</h2>

          <p>O WhatsApp tem uma falha estrutural para vendas: ele mostra conversas em ordem de última mensagem. Isso significa que um cliente com proposta enviada há três dias, esperando retorno, some embaixo de dezenas de conversas mais recentes. Ele existe — mas está invisível.</p>

          <p>No Kanban, esse cliente está na coluna "Proposta enviada", com um indicador claro de que está parado há 3 dias. Impossível ignorar. A ação necessária (fazer follow-up) está visível antes de você precisar lembrar.</p>

          <p>Essa é a diferença entre gerenciar de forma reativa (respondendo ao que aparece na frente) e gerenciar de forma proativa (agindo com base numa visão completa do pipeline).</p>

          <h2>Quais etapas usar no Kanban de vendas?</h2>

          <p>Não existe um modelo universal — e isso é uma vantagem. O Kanban deve refletir o processo real da sua empresa, não um processo teórico ideal.</p>

          <p>Para definir as etapas certas, faça um exercício simples: mapeie o que acontece com um cliente desde o primeiro contato até o fechamento. Quais são os momentos onde a conversa precisa de uma ação específica da equipe?</p>

          <p>Para a maioria dos pequenos negócios que vendem pelo WhatsApp, 4 a 5 colunas são suficientes. Exemplo para uma empresa de serviços:</p>

          <ul>
            <li><strong>Novo contato:</strong> cliente entrou em contato, ainda não foi qualificado.</li>
            <li><strong>Qualificado:</strong> já entendemos o que ele precisa e é um lead genuíno.</li>
            <li><strong>Proposta enviada:</strong> orçamento ou proposta foi para ele, aguardando resposta.</li>
            <li><strong>Em negociação:</strong> proposta recebida, discutindo condições.</li>
            <li><strong>Fechado / Perdido:</strong> resultado definido.</li>
          </ul>

          <p>Começar simples e ajustar com o tempo é muito melhor do que criar um processo complexo que a equipe não vai usar.</p>

          <h2>Como o Kanban ajuda o gestor a tomar decisões?</h2>

          <p>Sem o Kanban, o gestor gerencia por conversas — ele lembra dos clientes que aparecem na frente. Com o Kanban, ele gerencia por pipeline — ele vê onde estão concentradas as oportunidades e onde estão os gargalos.</p>

          <p>Se a coluna "Em negociação" está cheia mas a coluna "Fechado" está vazia, há um problema no fechamento. Se a coluna "Novo contato" está transbordando, há um problema de qualificação ou capacidade da equipe. Se "Proposta enviada" tem clientes parados há mais de uma semana, há um problema de follow-up.</p>

          <p>Cada coluna parada conta uma história. E histórias baseadas em dados levam a decisões muito melhores do que intuição.</p>

          <h2>CRM Kanban é para qualquer tamanho de empresa?</h2>

          <p>Sim. Uma empresa com um único vendedor gerenciando 20 oportunidades simultâneas se beneficia do Kanban tanto quanto uma empresa com 10 vendedores. O critério não é tamanho — é o volume de negociações simultâneas.</p>

          <p>A partir do momento que é difícil responder "quais são as 5 maiores oportunidades que temos agora e em que etapa cada uma está?" de cabeça — você precisa de um Kanban.</p>

          <h2>Conclusão</h2>

          <p>CRM Kanban não é ferramenta de empresa grande. É a forma mais acessível e visual de dar clareza ao processo de vendas — especialmente para quem opera pelo WhatsApp, onde a lista de conversas não oferece nenhuma visão de funil.</p>

          <p>Com o Kanban, você para de gerenciar o que aparece na frente e começa a gerenciar com intenção. E gestão intencional, mesmo num time pequeno, gera resultados melhores do que muito esforço desorganizado.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer visualizar todo o seu funil de vendas no WhatsApp?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect inclui CRM Kanban integrado ao histórico de conversas — para que o gestor e a equipe vejam onde está cada oportunidade, sem precisar abrir o WhatsApp de cada cliente.
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
