import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como identificar clientes esquecidos no pipeline e reativar oportunidades perdidas",
  description:
    "Todo pipeline tem clientes fantasmas — entraram com interesse, ficaram parados, e ninguém percebeu. Identificar e reativar esses contatos é uma das formas mais baratas de aumentar vendas.",
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
          Como identificar clientes esquecidos no pipeline e reativar oportunidades perdidas
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Um pipeline cheio de oportunidades parece positivo. Mas quando metade delas está parada há semanas sem nenhuma interação, o que parece riqueza é ilusão — e oportunidade desperdiçada.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min · Categoria: CRM · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>Todo pipeline acumula "mortos-vivos" — clientes que entraram com interesse genuíno, trocaram algumas mensagens, ficaram parados, e gradualmente foram esquecidos sem que ninguém tenha tomado nenhuma decisão consciente sobre eles.</p>

          <p>Esses contatos não são necessariamente perdidos. Em muitos casos, o cliente ainda tem a necessidade — mas a empresa parou de aparecer na frente dele. Alguém que retoma o contato de forma adequada ainda consegue fechar. A questão é saber quem são esses clientes e quando retomar.</p>

          <h2>O que é um cliente "esquecido" no pipeline?</h2>

          <p>Um cliente esquecido não é aquele que disse "não" — esse foi descartado conscientemente. É aquele que ficou no meio do caminho: demonstrou interesse, a conversa esfriou, e ninguém tomou a decisão de descartar ou de retomar.</p>

          <p>Ele está no pipeline ocupando espaço e distorcendo as métricas (o total de "oportunidades abertas" parece maior do que é de fato), mas na prática está morto por abandono.</p>

          <p>O problema é que, sem sistema, você não sabe quais são. Eles se misturam com as oportunidades genuinamente ativas — e o gestor não consegue distinguir sem abrir conversa por conversa.</p>

          <h2>Como identificar clientes parados sem analisar um por um?</h2>

          <p>Com CRM, existe um filtro simples e poderoso: <em>último contato há mais de X dias, com status diferente de fechado ou perdido</em>.</p>

          <p>Esse filtro revela imediatamente todo cliente que está no pipeline mas não teve nenhuma interação há mais tempo do que o seu ciclo de venda normalmente demora. Se sua venda típica leva 7 dias do primeiro contato ao fechamento, qualquer oportunidade parada há mais de 14 dias merece atenção.</p>

          <p>Sem CRM, fazer essa análise manualmente é inviável com qualquer volume relevante. É necessário abrir cada conversa, verificar a data do último contato, e comparar com hoje. Isso leva horas — e raramente é feito.</p>

          <h2>Quando um cliente parado ainda vale ser reativado?</h2>

          <p>Nem todo cliente esquecido merece reativação. Antes de entrar em contato, avalie três critérios:</p>

          <ul>
            <li><strong>Quanto tempo passou?</strong> Um cliente parado há 15 dias num ciclo de venda de 7 dias é diferente de um parado há 6 meses. Quanto mais tempo, menor a probabilidade — mas não zero.</li>
            <li><strong>Qual foi o último sinal do cliente?</strong> Ele pediu para pensar? Ou sumiu sem dar retorno após a proposta? O contexto da última interação muda a estratégia de reativação.</li>
            <li><strong>Qual é o tamanho da oportunidade?</strong> Para oportunidades de alto valor, vale a pena tentar mesmo que seja difícil. Para oportunidades pequenas paradas há muito tempo, o custo de reativação pode ser maior do que o retorno.</li>
          </ul>

          <h2>Como reativar um cliente parado sem parecer insistente?</h2>

          <p>A chave é a leveza. Uma mensagem que não pressiona, não relembra a conversa inteira, e não exige uma decisão — apenas reabre a porta.</p>

          <p>Um modelo que funciona bem:</p>

          <p><em>"Oi [nome], quanto tempo! Passando para ver como você está e se ainda faz sentido a gente retomar a conversa sobre [assunto]. Se o momento não for agora, tudo bem também — só queria dar um oi mesmo."</em></p>

          <p>Essa mensagem é eficaz por três razões: é curta (não exige muito do cliente), é humana (não parece script comercial), e é não-invasiva (dá saída para ele dizer que não é o momento). Paradoxalmente, essa abertura de saída aumenta as respostas — porque o cliente não se sente encurralado.</p>

          <h2>O que fazer quando o cliente responde que não é o momento?</h2>

          <p>Isso é informação valiosa, não rejeição. "Não é o momento" tem uma data implícita. Vale perguntar: "Entendo! Quando seria um momento melhor para você?" — e registrar a resposta. Se ele diz "no segundo semestre", você tem uma data concreta para uma próxima tentativa.</p>

          <p>Um cliente que diz "não agora" e recebe um acompanhamento no momento certo — quando ele disse que estaria pronto — tem uma probabilidade muito maior de fechar do que um cliente que nunca foi reativado.</p>

          <h2>Por que limpar o pipeline de mortos-vivos importa?</h2>

          <p>Pipeline inflado com oportunidades que não vão fechar distorce as métricas e a visão do gestor. Quando você enxerga "80 oportunidades abertas" mas 50 delas estão paradas há mais de um mês, a sensação de progresso é falsa.</p>

          <p>Fechar como "perdido" os clientes que não respondem após múltiplas tentativas de reativação não é derrota — é limpeza. Um pipeline com 30 oportunidades reais é mais útil do que um com 80 oportunidades fictícias. As métricas ficam honestas, e o time foca onde de fato pode fazer diferença.</p>

          <h2>Com que frequência revisar o pipeline em busca de clientes esquecidos?</h2>

          <p>Uma revisão semanal de 15 a 20 minutos é suficiente para a maioria dos times. O objetivo não é resolver tudo de uma vez — é identificar os que precisam de ação urgente e agir naquela semana.</p>

          <p>Com o tempo, essa revisão vira um hábito que mantém o pipeline saudável por padrão — e os clientes esquecidos são reativados rapidamente, antes que o interesse esfrie demais.</p>

          <h2>Conclusão</h2>

          <p>Clientes esquecidos no pipeline são oportunidades perdidas que ainda podem ser recuperadas — desde que você saiba quais são e entre em contato no momento certo, da forma certa. Isso exige visibilidade (CRM com filtro de inatividade) e método (abordagem de reativação adequada).</p>

          <p>Para a maioria dos times de vendas pelo WhatsApp, a reativação de leads esquecidos é uma das formas mais baratas e subutilizadas de aumentar receita. O lead já existe, o interesse já existiu — falta só o follow-up que nunca aconteceu.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer ver quais clientes estão parados no seu pipeline?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect mostra clientes por tempo de inatividade para que sua equipe identifique e reative oportunidades antes que esfriem definitivamente.
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
