import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Por que seu time perde vendas no WhatsApp sem perceber",
  description: "As perdas de venda no WhatsApp raramente aparecem nos relatórios — elas simplesmente somem. Conheça os padrões mais comuns e como corrigir antes que virem hábito.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Vendas</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Por que seu time perde vendas no WhatsApp sem perceber
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          O cliente que foi embora sem comprar raramente manda uma mensagem de despedida. Ele simplesmente para de responder. E sem processo, a empresa nunca sabe por quê.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: Vendas • Palavra-chave: perder vendas WhatsApp
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>A maioria das perdas de venda pelo WhatsApp são invisíveis. Não aparecem em nenhum relatório. O atendente nem sabe que perdeu — afinal, o cliente não disse que foi para o concorrente. Apenas parou de responder.</p>
          <p>Isso significa que empresas que não monitoram o processo estão, na prática, voando cegas sobre o volume real de oportunidades perdidas.</p>

          <h2>Causa 1: Demora na primeira resposta</h2>
          <p>No WhatsApp, o cliente que manda mensagem geralmente está avaliando mais de uma opção ao mesmo tempo. Quem responde primeiro, muitas vezes ganha. Demora de mais de 30 minutos em horário comercial já representa risco real de perder a oportunidade para um concorrente mais rápido.</p>

          <h2>Causa 2: Proposta enviada sem acompanhamento</h2>
          <p>Enviar um orçamento e esperar passivamente é uma estratégia de perda garantida. A maioria dos clientes precisa de mais de um ponto de contato antes de decidir. Sem follow-up, a proposta some na lista de mensagens e a oportunidade evapora.</p>

          <h2>Causa 3: Atendente sem autonomia para resolver</h2>
          <p>Quando o cliente precisa esperar o atendente "verificar com o gerente" a cada pergunta, o atrito aumenta. Clientes com urgência ou com opções de concorrentes imediatos não esperam. Eles vão embora.</p>

          <h2>Causa 4: Histórico perdido na troca de atendente</h2>
          <p>O cliente que foi bem atendido por uma pessoa e depois caiu para outra que não tinha contexto algum provavelmente terá uma experiência frustrante. E experiências frustrantes não convertem.</p>

          <h2>Causa 5: Falta de próxima ação definida</h2>
          <p>Conversas que terminam sem um próximo passo claro tendem a esfriar. "Você pensa e me fala" é diferente de "vou te mandar mais informações hoje às 17h". A segunda cria compromisso e mantém o cliente no processo.</p>

          <h2>Como descobrir onde seu time está perdendo?</h2>
          <p>A única forma é ter visibilidade das conversas. Com histórico centralizado, é possível revisar atendimentos que não resultaram em venda e identificar os padrões: onde a conversa esfriou, o que foi dito antes do cliente sumir, quanto tempo levou cada etapa.</p>
          <p>Essa análise transforma suposições em diagnóstico preciso — e diagnóstico preciso gera ação correta.</p>

          <h2>Conclusão</h2>
          <p>Perder vendas no WhatsApp não é inevitável. É um problema de processo, não de produto ou preço. Com visibilidade do que acontece nas conversas e indicadores simples, qualquer equipe consegue identificar e corrigir os pontos de vazamento antes que virem hábito.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer parar de perder vendas invisíveis?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect registra histórico, SLA e funil para que o gestor veja onde estão os vazamentos e corrija o processo.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
