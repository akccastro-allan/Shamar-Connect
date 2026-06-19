import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como recuperar clientes que pararam de responder no WhatsApp",
  description:
    "Cliente sumido não é cliente perdido. Na maioria dos casos, ele parou de responder porque a vida aconteceu — não porque decidiu não comprar. A abordagem certa ainda recupera a conversa.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">
          ← Voltar para o blog
        </Link>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
          Vendas
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como recuperar clientes que pararam de responder no WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          De cada 10 clientes que somem no meio de uma negociação, pelo menos 3 ainda podem ser recuperados com a abordagem certa e no momento certo. A maioria das empresas não tenta — e perde essas vendas desnecessariamente.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 8 min · Categoria: Vendas · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>O cenário é familiar: o cliente estava animado. Fizeram uma boa conversa, você enviou a proposta, ele disse que ia analisar. E então: silêncio. Um dia, dois dias, uma semana.</p>

          <p>O instinto de muitos vendedores é assumir que ele perdeu o interesse e seguir em frente. Mas isso raramente é o que aconteceu de fato. A maioria dos clientes que param de responder no WhatsApp não tomou uma decisão consciente de não comprar — eles foram engolidos pela rotina. A conversa foi empurrada para baixo na lista de prioridades e nunca mais voltou ao topo.</p>

          <p>Isso significa que o interesse original ainda pode estar lá. Só precisa de um empurrão para voltar à superfície.</p>

          <h2>Por que clientes somem sem dizer "não"?</h2>

          <p>Entender o motivo do sumiço é o primeiro passo para saber como reagir. Existem padrões bem definidos:</p>

          <p><strong>A vida aconteceu.</strong> Uma emergência no trabalho, um problema pessoal, uma viagem não planejada. O cliente tinha intenção de responder "depois" — e depois nunca chegou. Não é rejeição, é prioridade que mudou temporariamente.</p>

          <p><strong>Ele está esperando algo interno.</strong> Precisa de aprovação do sócio, de feedback do financeiro, de uma reunião com a equipe. Está com o processo travado do lado dele — mas não te avisou porque parece constrangedor dizer "não fechei ainda".</p>

          <p><strong>Surgiu uma objeção que ele não verbalizou.</strong> Alguma coisa na proposta gerou dúvida ou resistência, mas em vez de perguntar, ele desapareceu. Isso é muito comum — especialmente com clientes que têm dificuldade de lidar com situações de negociação.</p>

          <p><strong>Está avaliando outras opções.</strong> Pediu proposta para mais de uma empresa e está comparando. A conversa está em standby enquanto ele decide.</p>

          <p>Em nenhum desses casos o cliente tomou uma decisão definitiva de não comprar. Em todos eles, uma abordagem adequada ainda pode recuperar a conversa.</p>

          <h2>Qual é a abordagem errada para recuperar um cliente que sumiu?</h2>

          <p>A abordagem mais comum — e mais contraproducente — é mandar uma sequência de "oi, tudo bem?", "você viu minha proposta?", "só passando para lembrar que a oferta é válida até sexta". Cada mensagem pressiona mais. O cliente, que já estava sem energia para responder, agora também está se sentindo pressionado. O resultado é o oposto do que se queria.</p>

          <p>A segunda abordagem errada é esperar indefinidamente sem agir. Isso garante que a oportunidade vai se perder — e também não gera nenhum dado sobre o motivo.</p>

          <h2>Como estruturar a tentativa de recuperação?</h2>

          <p>Uma estratégia eficaz tem três etapas distintas, em momentos distintos:</p>

          <p><strong>Tentativa 1 — Verificação simples (3 a 5 dias após o sumiço):</strong></p>
          <p><em>"Oi [nome], passando para ver se você recebeu bem minha proposta e se ficou com alguma dúvida. Qualquer coisa é só falar!"</em></p>
          <p>Sem pressão, sem cobrar decisão. Apenas reabre a conversa de forma natural.</p>

          <p><strong>Tentativa 2 — Valor adicionado (7 a 10 dias depois, se não houver resposta):</strong></p>
          <p><em>"Oi [nome]! Lembrei de você porque acabei de resolver uma situação parecida com a sua — [detalhe específico]. Achei que poderia ser relevante. Posso te contar mais se quiser."</em></p>
          <p>Esse contato traz algo novo — uma informação, um caso, uma atualização — que justifica o retorno sem parecer pressão.</p>

          <p><strong>Tentativa 3 — Clareza direta (10 a 15 dias depois, se ainda não houver resposta):</strong></p>
          <p><em>"Oi [nome], queria entender em que pé está. Ainda faz sentido avançar com isso, ou as prioridades mudaram por aí? Qualquer resposta me ajuda a entender."</em></p>
          <p>Pergunta direta, sem julgamento. Muitas vezes gera a resposta honesta que estava faltando — seja um "sim, me manda de novo" ou um "foi um mau momento, posso contactar daqui 2 meses?".</p>

          <p><strong>Mensagem de encerramento (20 a 30 dias depois, sem resposta em nenhuma tentativa):</strong></p>
          <p><em>"Oi [nome], percebo que não é o momento certo agora — tudo bem, entendo completamente. Fico à disposição quando fizer sentido voltar a conversar. Tudo de bom!"</em></p>
          <p>Esta mensagem remove toda a pressão acumulada. É contraintuitivo, mas é estatisticamente a mensagem com mais respostas no ciclo — porque o cliente se sente liberado da culpa de não ter respondido.</p>

          <h2>O que fazer com as respostas de clientes recuperados?</h2>

          <p>Quando um cliente responde após um período de sumiço, não faça a mesma proposta do zero como se nada tivesse acontecido. Reconheça a conversa anterior: <em>"Que bom te ouvir! Pelo que a gente tinha conversado, você estava analisando [X]. Ainda é isso que faz sentido, ou as prioridades mudaram?"</em></p>

          <p>Isso mostra que você se lembrou — e que a continuidade é genuína, não um script repetido.</p>

          <h2>Como identificar quais clientes precisam de tentativa de recuperação?</h2>

          <p>Sem sistema, é impossível identificar sistematicamente quem está parado há quantos dias. O vendedor lembra dos clientes que aparecem na frente — que são os mais recentes, não necessariamente os que mais precisam de atenção.</p>

          <p>Com CRM, o filtro "último contato há mais de X dias, status aberto" revela todos os clientes em situação de recuperação potencial. Isso transforma uma atividade casual ("eu me lembro de quem devo ligar") em processo sistemático ("todo cliente parado há mais de 7 dias está nessa lista e precisa de ação hoje").</p>

          <h2>Conclusão</h2>

          <p>Recuperar clientes que pararam de responder não é insistência — é processo. A diferença está em como você aborda: sem pressão, com relevância, em cadência adequada ao ciclo da venda, e com clareza suficiente para chegar a uma resposta definitiva quando o cliente realmente não está interessado.</p>

          <p>Empresas que estruturam esse processo recuperam entre 20% e 35% das oportunidades que teriam perdido por abandono. Esse é um crescimento real de receita — sem nenhum custo de aquisição de novos leads.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer identificar e reativar clientes parados automaticamente?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect mostra quais clientes estão parados por tempo de inatividade para que sua equipe faça a tentativa de recuperação no momento certo — com o contexto completo da conversa anterior.
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
