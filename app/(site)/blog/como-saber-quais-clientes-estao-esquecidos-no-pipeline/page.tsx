import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como saber quais clientes estão esquecidos no pipeline",
  description: "Clientes parados no pipeline são oportunidades perdidas silenciosas. Veja como identificar e reativar contatos esquecidos antes que decidam com o concorrente.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">CRM</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como saber quais clientes estão esquecidos no pipeline
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Todo pipeline tem clientes fantasmas — entraram, ficaram parados e ninguém percebeu. Identificá-los é o primeiro passo para recuperar oportunidades que ainda estão vivas.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 6 min • Categoria: CRM • Palavra-chave: pipeline esquecido clientes inativos
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>Um cliente que parou de responder no WhatsApp não é necessariamente um cliente perdido. Muitas vezes ele está ocupado, aguardando um momento melhor, ou simplesmente esperando que alguém da empresa retome o contato. A maioria nunca retoma.</p>
          <p>O resultado é um pipeline cheio de oportunidades que parecem ativas mas estão, na prática, mortas por abandono. E o pior: o gestor não sabe quantas nem quais são.</p>

          <h2>O que é um cliente esquecido no pipeline?</h2>
          <p>Um cliente esquecido é aquele que entrou no funil — fez contato, recebeu proposta, demonstrou interesse — mas não avançou nem foi formalmente descartado. Ficou em um limbo. Ninguém fez follow-up, nenhum próximo passo foi definido, e o tempo foi passando.</p>

          <h2>Como identificar sem precisar revisar conversa por conversa?</h2>
          <p>Com CRM, é possível filtrar clientes pela data do último contato. "Mostre todos com último contato há mais de 10 dias e status diferente de fechado ou perdido" revela imediatamente quem está parado. Sem CRM, isso é manualmente impossível quando o pipeline tem dezenas de contatos.</p>

          <h2>Como reativar um cliente esquecido?</h2>
          <p>A abordagem mais eficaz é a mensagem curta e direta, sem pressão: "Ei [nome], fico passando para ver se faz sentido ainda conversar sobre [assunto]. Se o momento não for agora, tudo bem também." Essa mensagem elimina a pressão, abre porta para honestidade e frequentemente provoca uma resposta — positiva ou definitiva.</p>
          <p>Evite mensagens longas de reativação que parecem uma apresentação do zero. O cliente já se apresentou — ele precisa que a empresa se lembre dele, não que se reapresente.</p>

          <h2>O que fazer com clientes realmente perdidos?</h2>
          <p>Fechar formalmente como perdido é importante. Parece contra-intuitivo, mas um pipeline limpo — sem mortos-vivos — é muito mais utilizável do que um pipeline cheio de oportunidades falsas. O gestor consegue ver o volume real, as métricas são mais precisas e a equipe se concentra em oportunidades reais.</p>

          <h2>Com que frequência revisar o pipeline?</h2>
          <p>Uma revisão semanal de 15 minutos é suficiente para a maioria dos negócios. O objetivo não é resolver tudo — é identificar os que precisam de ação e agir. Com o tempo, isso vira hábito e o pipeline se mantém saudável por padrão.</p>

          <h2>Conclusão</h2>
          <p>Clientes esquecidos no pipeline são oportunidades recuperáveis. Com visibilidade de quem está parado e quanto tempo se passou, qualquer equipe consegue reativar contatos antes que se tornem definitivamente perdidos.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer ver quem está esquecido no seu pipeline?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect mostra clientes parados por tempo de inatividade para que sua equipe nunca perca uma oportunidade esquecida.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
