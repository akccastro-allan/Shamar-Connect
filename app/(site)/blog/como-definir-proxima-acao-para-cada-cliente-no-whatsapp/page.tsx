import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como definir a próxima ação para cada cliente no WhatsApp",
  description: "Conversas sem próxima ação definida esfriamm. Veja como criar o hábito de registrar o que fazer com cada cliente e transformar o pipeline em algo que avança sozinho.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Organização</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como definir a próxima ação para cada cliente no WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Um cliente sem próxima ação definida está, na prática, em espera indefinida. Esse hábito simples muda a dinâmica de todo o processo comercial.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 6 min • Categoria: Organização • Palavra-chave: próxima ação pipeline WhatsApp
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>A maioria das conversas no WhatsApp termina sem um próximo passo claro. O cliente pediu informações, o atendente enviou, e a conversa ficou em espera de "ele vai responder quando decidir". Essa postura passiva é responsável por grande parte das vendas perdidas.</p>
          <p>Definir a próxima ação é o hábito mais simples e mais impactante que uma equipe comercial pode adotar.</p>

          <h2>O que é uma "próxima ação" em vendas pelo WhatsApp?</h2>
          <p>É uma tarefa específica, com responsável e, idealmente, com prazo. Não é "aguardar retorno" — isso não é ação, é espera passiva. É "enviar proposta atualizada até quinta-feira", "ligar para confirmar reunião amanhã às 10h" ou "mandar mensagem de follow-up em 5 dias".</p>
          <p>A diferença parece pequena, mas muda completamente a postura da equipe: de reativa para proativa.</p>

          <h2>Como registrar a próxima ação sem complicar?</h2>
          <p>O momento certo para registrar é ao final de cada atendimento. Antes de fechar a conversa, o atendente define: qual é o próximo passo, quando acontece e de quem é a responsabilidade. Com CRM, isso fica registrado e aparece como lembrete no dia certo.</p>
          <p>Sem CRM, uma lista simples já funciona melhor do que nada — desde que seja revisada diariamente.</p>

          <h2>O que fazer quando a próxima ação é do cliente?</h2>
          <p>Mesmo quando a ação é do cliente ("ele vai pensar e me dá um retorno"), a equipe deve registrar um prazo para o próprio follow-up. Se o cliente não voltou em 3 dias, a próxima ação agora é da equipe: entrar em contato. A bola nunca pode ficar parada.</p>

          <h2>Como a próxima ação evita o pipeline entupido?</h2>
          <p>Quando toda oportunidade tem uma próxima ação registrada, é impossível que um cliente fique esquecido. Se a ação era para ontem e não foi feita, aparece em atraso. Isso cria um sistema de alerta automático que mantém o pipeline em movimento.</p>

          <h2>Conclusão</h2>
          <p>Definir a próxima ação para cada cliente é o hábito mais transformador em vendas pelo WhatsApp. Equipes que adotam essa prática encerram menos conversas no limbo, fazem mais follow-up no momento certo e convertem mais sem precisar de mais leads.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer registrar próximas ações e nunca esquecer um cliente?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect permite registrar próximas ações por cliente com datas e responsáveis, integrado ao histórico do WhatsApp.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
