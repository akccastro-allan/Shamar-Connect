import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como fazer follow-up sem ser chato no WhatsApp",
  description: "Follow-up eficaz não é insistência — é processo. Aprenda quando e como retomar contatos sem irritar o cliente e sem perder oportunidades de venda.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Vendas</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como fazer follow-up sem ser chato no WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Vendedores que não fazem follow-up perdem clientes. Vendedores que fazem errado afastam clientes. A diferença está no processo, não na personalidade.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: Vendas • Palavra-chave: follow-up WhatsApp vendas
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>A maioria das vendas não acontece no primeiro contato. Pesquisas do setor indicam que entre 5 e 8 pontos de contato são necessários antes de um cliente tomar a decisão de compra. Mas a maioria dos vendedores desiste depois do segundo.</p>
          <p>O follow-up eficaz não é sobre insistir — é sobre estar presente no momento certo, com a mensagem certa, sem criar pressão desnecessária.</p>

          <h2>Qual é a diferença entre follow-up e insistência?</h2>
          <p>Insistência é mandar a mesma mensagem várias vezes esperando uma resposta diferente. Follow-up é trazer algo novo a cada contato: uma informação relevante, uma resposta a uma dúvida anterior, uma proposta ajustada ou um lembrete combinado.</p>
          <p>Quando o vendedor só repete "você viu minha mensagem?" ou "e aí, decidiu?", o cliente sente pressão e se distancia. Quando o vendedor traz valor em cada retorno, o cliente percebe como cuidado.</p>

          <h2>Com que frequência fazer follow-up?</h2>
          <p>Uma referência prática: após enviar uma proposta, aguardar 2 dias antes do primeiro retorno. Se não houver resposta, aguardar 4 a 5 dias para o segundo. A partir daí, espaçar progressivamente — 7 dias, 14 dias, 30 dias — com mensagens diferentes em cada etapa.</p>
          <p>O intervalo pode variar de acordo com o ciclo de venda do negócio. Uma compra de alto valor com longa deliberação justifica intervalos maiores. Uma venda de baixo ticket com decisão rápida pode ter intervalos menores.</p>

          <h2>O que dizer em cada mensagem de follow-up?</h2>
          <p>Primeira retomada (2 dias): verificar se o cliente teve tempo de analisar, oferecer responder dúvidas. Segunda retomada (5 dias): adicionar uma informação relevante sobre o produto, serviço ou contexto do cliente. Terceira retomada (12 dias): perguntar diretamente se ainda faz sentido avançar ou se a necessidade mudou. Follow-up tardio (30+ dias): mensagem curta lembrando que o contato está disponível quando o cliente precisar.</p>

          <h2>Como registrar follow-ups sem depender da memória?</h2>
          <p>Depender da memória para lembrar quem precisa de retorno, quando e o que foi combinado é uma das principais causas de follow-up perdido. Com CRM, cada cliente tem seu histórico de contatos e o próximo passo registrado.</p>
          <p>Isso significa que o vendedor não precisa lembrar — ele precisa apenas verificar o que diz o sistema e agir. Isso escala muito melhor do que qualquer lista mental ou planilha.</p>

          <h2>Como encerrar o follow-up de forma elegante?</h2>
          <p>Quando o cliente não responde após múltiplas tentativas, a última mensagem mais eficaz é a de encerramento positivo: "Entendendo que não é o momento certo por enquanto. Fico à disposição quando precisar." Essa mensagem elimina a pressão, deixa a porta aberta e frequentemente provoca uma resposta honesta do cliente.</p>

          <h2>Conclusão</h2>
          <p>Follow-up é uma das habilidades mais valiosas em vendas — e uma das menos praticadas de forma sistemática. Com processo definido, mensagens com propósito e ferramentas que organizam os retornos, qualquer equipe consegue aumentar as conversões sem aumentar o incômodo.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer organizar o follow-up da sua equipe?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect registra próximas ações e histórico de cada cliente para que sua equipe nunca perca um follow-up.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
