import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como medir o desempenho da equipe de atendimento pelo WhatsApp",
  description: "Sem métricas, o gestor só sabe que tem problema quando o cliente reclama. Veja quais indicadores acompanhar para melhorar o atendimento antes que ele falhe.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Atendimento</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como medir o desempenho da equipe de atendimento pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          O gestor que não mede gerencia por intuição. Com indicadores simples, é possível identificar problemas antes que cheguem ao cliente e reconhecer quem está performando bem.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: Atendimento • Palavra-chave: desempenho equipe atendimento WhatsApp
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>Medir atendimento não é sobre criar pressão. É sobre ter dados para tomar decisões melhores: contratar mais uma pessoa, redistribuir a carga, identificar quem precisa de treinamento, ou reconhecer quem está entregando acima da média.</p>
          <p>A boa notícia é que os principais indicadores de atendimento pelo WhatsApp não são difíceis de entender — são difíceis de acompanhar sem ferramenta. Com o sistema certo, eles ficam visíveis automaticamente.</p>

          <h2>Indicador 1: Tempo médio de primeira resposta</h2>
          <p>Quanto tempo em média o cliente espera pela primeira mensagem da equipe. É o indicador mais direto de velocidade de atendimento e tem impacto direto na taxa de conversão — clientes que esperam mais tendem a desistir mais.</p>

          <h2>Indicador 2: Tempo médio de resolução</h2>
          <p>Quanto tempo leva desde o primeiro contato até o encerramento da conversa. Conversas longas podem indicar produto complexo, atendente sem autonomia para resolver, ou necessidade de automações para questões simples.</p>

          <h2>Indicador 3: Conversas por atendente</h2>
          <p>Quantas conversas cada atendente resolve por dia ou semana. Isso ajuda a identificar sobrecarga, ociosidade e diferenças de produtividade entre a equipe. Cuidado para não usar esse número isolado — um atendente que fecha menos conversas pode estar tratando casos mais complexos.</p>

          <h2>Indicador 4: Taxa de conversas reabertas</h2>
          <p>Percentual de conversas encerradas que o cliente volta a reabrir. Alto índice indica que os atendimentos não estão resolvendo o problema na primeira interação — ou que a equipe está encerrando conversas prematuramente.</p>

          <h2>Indicador 5: Conversas sem resposta por mais de X horas</h2>
          <p>Quantas conversas estão abertas sem nenhuma interação da equipe há mais de um tempo definido. Esse indicador captura conversas esquecidas antes que o cliente perceba o abandono.</p>

          <h2>Como começar a medir sem complicar?</h2>
          <p>Não é necessário acompanhar tudo de uma vez. Comece com um ou dois indicadores que mais importam para o negócio agora — geralmente tempo de primeira resposta e conversas em aberto. Quando esses dois estiverem estáveis, adicione os próximos.</p>
          <p>O objetivo não é ter um dashboard complexo — é ter dados suficientes para tomar uma decisão melhor do que a intuição permitiria.</p>

          <h2>Conclusão</h2>
          <p>Equipes medidas melhoram. Não porque a medição cria pressão, mas porque ela traz clareza. O atendente sabe o que é esperado, o gestor sabe o que está acontecendo, e as decisões de melhoria são baseadas em dados, não em sensação.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer métricas reais do seu atendimento?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect registra tempo de resposta, conversas abertas e desempenho por atendente para que o gestor tome decisões com dados.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
