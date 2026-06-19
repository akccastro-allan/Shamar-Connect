import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como medir o desempenho da equipe de atendimento pelo WhatsApp",
  description:
    "Sem métricas de atendimento, o gestor só descobre o problema quando o cliente reclama. Veja quais indicadores acompanhar, como interpretá-los e como agir antes que o problema chegue ao cliente.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">
          ← Voltar para o blog
        </Link>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
          Atendimento
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como medir o desempenho da equipe de atendimento pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Gestor que não mede gerencia por intuição — e intuição é boa para tomar decisões quando o cenário é familiar, mas falha sistematicamente em situações novas. Métricas de atendimento não são sobre controle: são sobre ter dados para tomar decisões melhores.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 9 min · Categoria: Atendimento · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>Existe um padrão muito comum em empresas que crescem pelo WhatsApp: enquanto a equipe é pequena, o gestor vê tudo porque está perto. Quando a equipe cresce para 4, 5, 6 pessoas, essa visão se perde — e ele só descobre que algo está errado quando o cliente liga para reclamar.</p>

          <p>Métricas mudam isso. Elas criam visibilidade antes que o problema chegue ao cliente. E fazem algo ainda mais valioso: mostram onde a equipe está indo bem — para que você possa reconhecer e replicar.</p>

          <h2>Por que a maioria das empresas não mede atendimento no WhatsApp?</h2>

          <p>Porque é difícil fazer manualmente. Calcular o tempo médio de resposta de cada atendente numa semana com 300 conversas não é algo que se faz com planilha sem investir horas. Por isso, muitos gestores simplesmente não medem — não por falta de vontade, mas por falta de ferramenta.</p>

          <p>A consequência é que decisões como "precisamos contratar alguém?", "esse atendente está bem?" ou "tem horário com gargalo?" são tomadas com base em impressão, não em dado.</p>

          <h2>Indicador 1: Tempo médio de primeira resposta</h2>

          <p>É o indicador mais direto de velocidade e o que mais impacta a taxa de conversão. Mede quanto tempo em média o cliente esperou antes de receber a primeira mensagem real da equipe (não mensagem automática).</p>

          <p><strong>Como usar:</strong> monitore por dia da semana e por atendente. Se segunda-feira tem consistentemente o pior tempo, há um problema de volume ou cobertura naquele dia. Se um atendente específico tem tempo de resposta 3x maior que os outros, investigue — pode ser sobrecarga, pode ser hábito de trabalho, pode ser problema técnico.</p>

          <p><strong>Benchmark orientativo:</strong> menos de 5 minutos em horário comercial é excelente. Entre 5 e 15 minutos é aceitável. Acima de 30 minutos representa risco real de perda de oportunidade.</p>

          <h2>Indicador 2: Tempo médio de resolução</h2>

          <p>Quanto tempo leva desde o primeiro contato do cliente até a conversa ser encerrada com problema resolvido. Esse número conta a história completa do atendimento — não só a abertura, mas toda a jornada.</p>

          <p><strong>Como usar:</strong> conversas com tempo de resolução muito alto podem indicar atendimentos complexos (que precisam de processo melhor), atendente sem autonomia para resolver (que precisa de mais treinamento), ou cliente que não voltou a responder (que precisa de follow-up ativo).</p>

          <p>Cuidado com a interpretação: tempo alto nem sempre é ruim. Uma negociação de venda de alto valor naturalmente demora mais. O que você quer evitar é tempo alto por <em>ineficiência</em>, não por complexidade legítima.</p>

          <h2>Indicador 3: Volume de conversas por atendente</h2>

          <p>Quantas conversas cada pessoa resolve por dia. Esse é o indicador que mostra se a carga está equilibrada — ou se alguém está sobrecarregado enquanto outro está ocioso.</p>

          <p><strong>Como usar com cuidado:</strong> volume absoluto pode enganar. Um atendente com 20 conversas resolvidas pode estar tratando casos simples, enquanto outro com 12 está gerenciando negociações complexas. O volume precisa ser lido junto com o tipo de conversa e com a qualidade das resoluções.</p>

          <p>Use o volume como ponto de entrada para uma investigação, não como conclusão definitiva.</p>

          <h2>Indicador 4: Conversas abertas sem resposta há mais de X horas</h2>

          <p>Esse é o indicador de "conversas esquecidas" — clientes que mandaram mensagem e ficaram sem retorno por mais tempo do que o SLA permite. É um alerta de urgência.</p>

          <p><strong>Como usar:</strong> esse número deve ser monitorado ao longo do dia, não apenas no final. Uma conversa sem resposta há 3 horas ainda pode ser salva. Uma sem resposta há 8 horas provavelmente já resultou em cliente insatisfeito ou perdido.</p>

          <p>O objetivo é que esse número seja sempre zero — ou o mais próximo de zero possível.</p>

          <h2>Indicador 5: Taxa de reaberturas</h2>

          <p>Percentual de conversas que foram encerradas mas o cliente voltou com o mesmo assunto. Alta taxa de reabertura é um sinal claro: os atendimentos não estão resolvendo o problema na primeira interação.</p>

          <p><strong>Como interpretar:</strong> reabertura pode acontecer por vários motivos. O atendente encerrou antes de o problema ser resolvido de verdade. A solução dada não funcionou. O cliente não entendeu a resposta e precisou voltar para pedir clareza. Cada causa tem uma solução diferente.</p>

          <h2>Como começar a medir sem se perder?</h2>

          <p>A armadilha mais comum é querer medir tudo de uma vez e acabar não usando nenhum dado de forma consistente. Comece com um único indicador — o que mais dói no momento. Normalmente é o tempo de primeira resposta.</p>

          <p>Monitore esse número por 30 dias. Entenda o padrão, o que faz ele piorar, o que faz melhorar. Quando ele estiver estável e dentro do SLA, adicione o segundo indicador.</p>

          <p>Métricas úteis são as que você olha toda semana e que geram uma ação. Métrica que existe mas não gera ação é ruído.</p>

          <h2>Métricas são sobre punição ou sobre melhoria?</h2>

          <p>Essa pergunta define o clima da equipe ao redor da medição. Se as métricas são usadas para punir ("você foi o pior do mês"), a equipe vai aprender a burlar os números ou vai criar ansiedade desnecessária. Se são usadas para melhorar ("esse indicador mostra que temos um gargalo às 14h, o que a gente pode fazer?"), a equipe passa a enxergar os dados como aliados.</p>

          <p>O mesmo número, com enquadramentos diferentes, gera culturas completamente diferentes. Escolha o enquadramento com cuidado.</p>

          <h2>Conclusão</h2>

          <p>Medir o desempenho de atendimento pelo WhatsApp não é sobre criar pressão ou construir um sistema de vigilância. É sobre substituir o "acho que está ok" por dados concretos que permitem decisões melhores — de contratação, de treinamento, de redistribuição, de reconhecimento.</p>

          <p>Equipes que são medidas e recebem feedback baseado em dados melhoram mais rápido e consistentemente. E gestores que medem tomam decisões mais precisas — sem precisar esperar a reclamação do cliente para descobrir que algo não está funcionando.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer indicadores reais do seu atendimento, sem planilha?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect registra automaticamente tempo de resposta, volume por atendente, conversas em aberto e SLA — para que o gestor tome decisões com dados, não com intuição.
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
