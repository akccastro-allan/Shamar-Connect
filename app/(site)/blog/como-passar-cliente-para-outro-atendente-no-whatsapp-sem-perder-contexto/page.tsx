import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como passar um cliente para outro atendente no WhatsApp sem perder contexto",
  description: "Transferência de atendimento no WhatsApp sem histórico gera retrabalho e frustra o cliente. Veja como fazer transições suaves com contexto preservado.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Atendimento</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como passar um cliente para outro atendente no WhatsApp sem perder contexto
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          "Pode repetir o que você precisa?" é uma das frases que mais irritam um cliente. Ela acontece porque a empresa não tem histórico centralizado.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 6 min • Categoria: Atendimento • Palavra-chave: transferência atendimento WhatsApp
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>Um cliente entra em contato, explica sua situação, pede ajuda. O atendente resolve parte do problema, mas precisa passar para outro colega especialista. O cliente repete tudo do início. Isso não é apenas inconveniente — é uma falha de processo que custa vendas e desgasta a confiança.</p>

          <h2>Por que a transferência de atendimento costuma ser ruim?</h2>
          <p>No WhatsApp tradicional (sem plataforma), o histórico está no celular de quem atendeu. Quando o atendente passa o contato adiante, o histórico não vai junto. O novo atendente começa do zero, sem saber o que foi discutido, o que foi prometido ou qual é a situação real do cliente.</p>
          <p>Isso gera dois problemas: o cliente precisa repetir tudo, e o novo atendente pode dar informações inconsistentes com o que foi dito anteriormente.</p>

          <h2>O que é necessário para uma transferência de qualidade?</h2>
          <p>Três elementos: histórico completo de conversas acessível para quem vai receber, notas ou contexto registrado pelo primeiro atendente, e clareza sobre o que está pendente e qual é a próxima ação esperada.</p>
          <p>Com isso, o segundo atendente entra na conversa informado. Não precisa pedir para o cliente repetir — só precisa confirmar o que já sabe e continuar de onde parou.</p>

          <h2>Como as notas de cliente ajudam na transferência?</h2>
          <p>Notas são registros rápidos feitos pelo atendente sobre o que foi discutido, o que o cliente precisa ou qualquer informação relevante que não está na conversa em si. Exemplo: "cliente tem urgência para entregar na sexta", "já enviamos proposta, está avaliando com o sócio", "não gosta de ser contatado antes das 10h".</p>
          <p>Esse tipo de informação contextualiza qualquer pessoa que assume o atendimento depois — seja um colega de equipe, um supervisor ou o mesmo atendente voltando de folga.</p>

          <h2>O que dizer ao cliente na transição?</h2>
          <p>Transparência ajuda. Uma mensagem simples como "Fulano agora vai continuar te ajudando — ele já está por dentro da sua situação" reduz a ansiedade do cliente e define expectativas claras. O cliente sabe que não vai precisar repetir tudo, e o novo atendente tem a responsabilidade de honrar essa promessa.</p>

          <h2>Como evitar que transferências virem rotina desnecessária?</h2>
          <p>Transferir muito pode indicar que os atendentes não têm autonomia ou treinamento suficiente para resolver as situações mais comuns. Mapeie os tipos de transferência que acontecem e veja se são realmente necessárias — ou se um treinamento melhor ou mais autonomia para a equipe resolveria o problema na origem.</p>

          <h2>Conclusão</h2>
          <p>Transferência de atendimento sem contexto é um dos maiores geradores de frustração no atendimento pelo WhatsApp. Com histórico centralizado e notas de cliente, a transição vira algo natural — e o cliente nem percebe que mudou de atendente.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer que sua equipe nunca perca contexto de cliente?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect centraliza histórico, notas e próximas ações para que qualquer atendente continue de onde o outro parou.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
