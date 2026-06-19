import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como usar notas de cliente no CRM para não perder contexto",
  description: "Notas de cliente são a memória da empresa. Sem elas, cada atendimento começa do zero. Veja como registrar contexto que realmente ajuda a equipe a vender e atender melhor.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">CRM</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como usar notas de cliente no CRM para não perder contexto
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          A memória de um vendedor é falha. A memória de um sistema, não. Notas de cliente transformam conversas passadas em contexto permanente para toda a equipe.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 6 min • Categoria: CRM • Palavra-chave: notas CRM contexto cliente
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>Imagine um cliente que já foi atendido três vezes. Na quarta vez que entra em contato, o atendente que pega não lembra nada — pede o nome, pergunta o que precisa, explica a empresa do zero. O cliente, que já passou por isso antes, sente que é apenas mais um número.</p>
          <p>Notas de cliente resolvem exatamente isso. São registros rápidos, feitos pelo atendente ao longo do tempo, que acumulam o contexto de cada cliente em um único lugar acessível para toda a equipe.</p>

          <h2>O que vale registrar em uma nota de cliente?</h2>
          <p>Tudo que não está na conversa em si mas que contextualiza o cliente. Exemplos práticos: "prefere receber informações por WhatsApp, não por e-mail"; "tem interesse no plano intermediário mas está esperando fechar contrato com o fornecedor"; "o sócio também participa das decisões, chamar os dois"; "cliente sensível a preço — apresentar valor antes de falar em investimento".</p>
          <p>Essas informações são ouro para quem vai atender depois. Elas transformam um atendimento genérico em um atendimento personalizado.</p>

          <h2>Quando registrar a nota?</h2>
          <p>Imediatamente após o atendimento, enquanto o contexto ainda está fresco. Deixar para depois é arriscar esquecer os detalhes que fazem diferença. Trinta segundos para registrar uma nota boa podem economizar minutos de retrabalho no próximo atendimento.</p>

          <h2>Qual é o tamanho ideal de uma nota?</h2>
          <p>Curta e objetiva. Uma ou duas frases com a informação mais relevante. Notas longas não são lidas. O objetivo é que qualquer atendente consiga absorver o contexto em 10 segundos antes de responder ao cliente.</p>

          <h2>Como notas ajudam na hora do follow-up?</h2>
          <p>Quando o vendedor retoma um contato depois de vários dias, a nota mostra onde a conversa parou. "Estava avaliando com o sócio, prazo estimado era fim do mês" é a informação exata que o vendedor precisa para retomar de forma personalizada, não genérica.</p>

          <h2>Conclusão</h2>
          <p>Notas de cliente são simples de implementar e têm impacto direto na qualidade do atendimento e nas taxas de conversão. Uma equipe que registra contexto consistentemente cria uma vantagem cumulativa — cada interação fica mais personalizada do que a anterior.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer que sua equipe nunca esqueça um contexto?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect inclui CRM com notas de cliente acessíveis para toda a equipe, integradas ao histórico de conversas do WhatsApp.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
