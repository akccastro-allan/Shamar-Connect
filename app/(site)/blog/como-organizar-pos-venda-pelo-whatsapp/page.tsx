import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como organizar o pós-venda pelo WhatsApp",
  description: "Pós-venda pelo WhatsApp é onde a maioria das empresas falha — e onde as melhores se diferenciam. Veja como criar um processo que transforma compradores em clientes recorrentes.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Vendas</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como organizar o pós-venda pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          A venda não termina no fechamento. Clientes que recebem acompanhamento pós-compra compram mais vezes e indicam mais. A maioria das empresas ignora essa etapa.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: Vendas • Palavra-chave: pós-venda WhatsApp clientes recorrentes
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>A venda mais cara de uma empresa é a de aquisição de novo cliente. A venda mais lucrativa é a segunda compra do mesmo cliente. No entanto, a maioria das empresas investe quase tudo no primeiro momento e esquece o segundo.</p>
          <p>Pós-venda pelo WhatsApp não é checklist de satisfação burocrático. É manter contato genuíno, resolver problemas com agilidade e criar o contexto para a próxima venda.</p>

          <h2>Qual é o objetivo do pós-venda?</h2>
          <p>Três objetivos concretos: garantir que o cliente teve uma boa experiência com o que comprou, resolver qualquer problema antes que ele vire reclamação, e posicionar a empresa para a próxima venda — seja por recompra ou por indicação.</p>

          <h2>Como estruturar o contato pós-venda?</h2>
          <p>Um fluxo simples e eficaz: mensagem de confirmação no momento da compra, verificação de entrega ou início de uso (1 a 3 dias depois), check-in de satisfação (7 a 14 dias depois), e reengajamento para nova oferta (30 a 60 dias depois, dependendo do ciclo do produto).</p>
          <p>Esse processo não precisa ser automatizado para funcionar. Com registro no CRM, o atendente tem o lembrete de quando contatar e o histórico de o que já foi dito.</p>

          <h2>Como pedir indicação pelo WhatsApp sem ser inconveniente?</h2>
          <p>O melhor momento para pedir indicação é logo após o cliente demonstrar satisfação. Uma mensagem simples: "Fico feliz que tenha gostado. Se você conhece alguém que pode se beneficiar da mesma forma, ficaria muito feliz com a indicação." Direto, sem pressão e no momento certo.</p>

          <h2>Como identificar clientes prontos para nova compra?</h2>
          <p>Com histórico de compras no CRM, é possível identificar padrões: clientes que recompram a cada X semanas, clientes que estão próximos do fim de um ciclo de produto, ou clientes que compraram A e têm perfil para comprar B. Essa visão transforma o CRM em ferramenta ativa de geração de receita.</p>

          <h2>Conclusão</h2>
          <p>Pós-venda bem executado pelo WhatsApp é um dos investimentos de maior retorno que uma empresa pode fazer. Clientes que se sentem cuidados após a compra têm muito mais probabilidade de comprar novamente e de indicar a empresa para outras pessoas.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer organizar o pós-venda da sua empresa?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect registra histórico de compras e próximas ações para que sua equipe nunca perca o momento certo de contatar um cliente.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
