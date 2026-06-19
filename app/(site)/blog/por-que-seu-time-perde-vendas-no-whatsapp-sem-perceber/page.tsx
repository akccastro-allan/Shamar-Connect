import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Por que seu time perde vendas no WhatsApp sem perceber (e como parar)",
  description:
    "As maiores perdas de venda pelo WhatsApp não aparecem em nenhum relatório. O cliente simplesmente para de responder. Conheça os 5 padrões mais comuns e como corrigir cada um.",
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
          Por que seu time perde vendas no WhatsApp sem perceber (e como parar)
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          O cliente que foi embora sem comprar raramente manda uma mensagem de despedida. Ele simplesmente para de responder. E sem processo ou visibilidade, a empresa nunca descobre onde foi que perdeu.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 9 min · Categoria: Vendas · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>Existe uma assimetria cruel no atendimento pelo WhatsApp: você sabe quando uma venda acontece — tem o pedido, o pagamento, a confirmação. Mas não sabe quando uma venda é perdida. O cliente não avisa. Ele só some.</p>

          <p>Isso significa que uma empresa pode estar perdendo 30%, 40% das oportunidades que chegam — e o gestor não tem como saber. O número que aparece no resultado é só o que fechou, nunca o que poderia ter fechado.</p>

          <p>Esse tipo de perda invisível tem padrões bem definidos. Identificá-los é o primeiro passo para parar de repeti-los.</p>

          <h2>Causa 1: Demora para responder o primeiro contato</h2>

          <p>No WhatsApp, o cliente que mandou mensagem geralmente está avaliando mais de uma opção ao mesmo tempo. Não necessariamente de forma consciente e estratégica — mas pelo simples fato de que, se você não responder, ele vai procurar outra empresa.</p>

          <p>A janela de atenção é curta. Nos primeiros 5 minutos após enviar a mensagem, o cliente está focado e esperando. Depois de 15 minutos, ele já foi para outra atividade. Depois de 1 hora, você precisa reconquistar a atenção que já existiu.</p>

          <p><strong>Como corrigir:</strong> defina um SLA de primeiro contato e monitore. Se o problema for volume, ajuste a escala. Se for horário sem cobertura, configure mensagem automática que gerencia a expectativa e informe o horário de retorno.</p>

          <h2>Causa 2: Proposta enviada sem acompanhamento ativo</h2>

          <p>Enviar uma proposta e esperar passivamente é, na prática, não vender. A maioria dos clientes não vai voltar espontaneamente para dizer que topou. Eles precisam de um empurrão — que não é pressão, mas sim continuidade.</p>

          <p>O problema é que muitos vendedores sentem que retomar após a proposta é "chatear o cliente". Essa percepção está errada. O que chateia não é o retorno em si — é o retorno sem valor, sem propósito, sem nada novo para oferecer.</p>

          <p><strong>Como corrigir:</strong> toda proposta enviada deve ter uma data de follow-up registrada. O vendedor não pode enviar uma proposta e esquecer. O sistema deve alertar quando o follow-up está atrasado.</p>

          <h2>Causa 3: Atendente sem informação para responder dúvidas</h2>

          <p>O cliente faz uma pergunta técnica. O atendente diz "deixa eu verificar e te retorno". Passa 3 horas. O cliente já foi para o concorrente que respondeu na hora.</p>

          <p>Esse padrão acontece quando o atendente não tem as informações que precisa prontamente disponíveis — seja porque nunca foi treinado sobre o produto, seja porque a empresa não tem uma base de conhecimento organizada, seja porque o processo de aprovação de preços ou condições é lento demais.</p>

          <p><strong>Como corrigir:</strong> invista em treinamento de produto e numa base de respostas rápidas para as perguntas mais frequentes. Mapeie as dúvidas que mais aparecem e garanta que todo atendente consiga respondê-las sem precisar escalar.</p>

          <h2>Causa 4: Histórico perdido na troca de atendente</h2>

          <p>O cliente que já explicou a situação dele uma vez e precisa repetir tudo para um segundo atendente tem a experiência destruída — não importa o quanto o segundo atendente seja simpático e esforçado. A percepção é: essa empresa não se organiza.</p>

          <p>E cliente que perde a confiança na organização da empresa hesita em confiar no produto ou serviço. A lógica emocional é simples: se eles não conseguem se comunicar internamente, como vão cumprir o que prometem para mim?</p>

          <p><strong>Como corrigir:</strong> centralize o histórico de atendimento numa plataforma que todos acessam. O próximo atendente precisa conseguir ver toda a conversa anterior antes de dizer a primeira palavra ao cliente.</p>

          <h2>Causa 5: Nenhuma próxima ação definida no final da conversa</h2>

          <p>Conversas que terminam com "tá bom, pode pensar" ficam no limbo. Não há compromisso de nenhum lado. O cliente não tem prazo para decidir. O vendedor não tem data para retomar. E a conversa esfria naturalmente.</p>

          <p>Esse é o padrão mais fácil de corrigir e o mais negligenciado. Definir um próximo passo antes de encerrar qualquer conversa de venda é um hábito que muda a taxa de conversão de forma significativa.</p>

          <p><strong>Como corrigir:</strong> ao final de cada atendimento, o vendedor define: <em>"Vou te mandar o material até amanhã às 18h"</em> ou <em>"Você consegue dar um retorno até quinta?"</em>. Compromisso com data. Não "quando você puder".</p>

          <h2>Como descobrir qual padrão está acontecendo na sua empresa?</h2>

          <p>A única forma honesta é ter visibilidade das conversas. Com histórico centralizado, você pode revisar atendimentos que não converteram e identificar os padrões: onde a conversa esfriou, o que foi dito imediatamente antes do cliente parar de responder, quanto tempo demorou entre cada etapa.</p>

          <p>Sem essa visibilidade, você está gerenciando com base em feeling. Com ela, você tem diagnóstico preciso — e diagnóstico preciso é o que permite mudança real de processo.</p>

          <h2>Conclusão</h2>

          <p>Perdas de venda no WhatsApp são, na sua maioria, problemas de processo — não de produto, preço ou mercado. Quando o processo funciona (resposta rápida, follow-up estruturado, informação disponível, histórico centralizado, próximos passos definidos), a taxa de conversão melhora sem precisar aumentar o volume de leads.</p>

          <p>O primeiro passo é ter visibilidade. O segundo é identificar qual dos cinco padrões está mais presente na sua operação. O terceiro é corrigir um de cada vez, em ordem de impacto.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer ter visibilidade de onde sua equipe perde vendas?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect centraliza histórico, SLA e funil de vendas para que o gestor identifique os pontos de vazamento e corrija antes que virem hábito.
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
