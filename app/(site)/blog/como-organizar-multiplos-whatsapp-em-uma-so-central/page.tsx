import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como organizar múltiplos WhatsApp em uma só central",
  description: "Empresa com mais de um número de WhatsApp? Veja como centralizar todos os atendimentos, históricos e equipes sem perder conversa.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">WhatsApp</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como organizar múltiplos WhatsApp em uma só central
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Empresa com dois números, dois celulares, dois responsáveis — e nenhuma visão unificada. Esse caos tem solução.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: WhatsApp • Palavra-chave: múltiplos WhatsApp empresa
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>Muitas empresas chegam a um ponto onde um único número de WhatsApp não é mais suficiente. Pode ser porque cresceram, porque têm departamentos diferentes, porque atendem marcas distintas, ou porque precisam separar o pessoal do profissional.</p>
          <p>O resultado costuma ser caos: histórico espalhado em vários celulares, gestor sem visão do que acontece em cada canal, clientes que falam com pessoas diferentes sem contexto compartilhado.</p>

          <h2>Por que uma empresa acaba com múltiplos WhatsApp?</h2>
          <p>As razões mais comuns: vendas usa um número, suporte usa outro, a diretora tem o próprio número pessoal para clientes VIP, e a loja física tem um número diferente do e-commerce. Cada um cresceu separado, sem planejamento de como unificar.</p>
          <p>Empresas do varejo, moda, turismo e serviços chegam a ter três ou quatro números ativos ao mesmo tempo, cada um gerenciado de forma independente.</p>

          <h2>Qual é o problema real de ter múltiplos WhatsApp separados?</h2>
          <p>O cliente que comprou pelo número de vendas e agora tem um problema de pós-venda não sabe que o suporte usa outro número. O gestor que quer ver quantos atendimentos abriram hoje precisa olhar quatro celulares. O atendente que saiu de férias levou o histórico no próprio telefone.</p>
          <p>Sem centralização, cada número é uma ilha. O histórico fica fragmentado, as métricas são impossíveis de consolidar e a experiência do cliente sofre.</p>

          <h2>Como centralizar sem perder a identidade de cada canal?</h2>
          <p>A abordagem certa não elimina os números — ela os organiza em uma visão unificada. Cada número continua ativo, mas os atendimentos de todos aparecem no mesmo painel para o gestor. A equipe pode ser diferente para cada número, mas o histórico está acessível de um só lugar.</p>
          <p>Isso permite manter um número para vendas, outro para suporte e outro para um segmento específico, sem perder o controle da operação como um todo.</p>

          <h2>O que muda na prática para a equipe?</h2>
          <p>O atendente entra em uma plataforma e vê as conversas do canal pelo qual é responsável. O gestor tem visão de todos os canais. O histórico de um cliente que já apareceu em diferentes canais fica centralizado no CRM, não espalhado em aparelhos diferentes.</p>
          <p>Se um atendente sai ou muda de função, o histórico fica na plataforma — não some com o celular.</p>

          <h2>Quando vale a pena consolidar?</h2>
          <p>A partir do segundo número ativo e mais de duas pessoas envolvidas no atendimento, a centralização já se paga. O tempo perdido trocando de celular, explicando para o cliente quem é quem e buscando histórico em conversas antigas é um custo real — mesmo que invisível no dia a dia.</p>

          <h2>Conclusão</h2>
          <p>Múltiplos WhatsApp são um sinal de crescimento, mas também de complexidade que precisa de organização. Centralizar não significa acabar com os números — significa ter visão e controle sobre todos eles a partir de um só lugar.</p>
          <p>Empresas que dão esse passo ganham em agilidade, qualidade de atendimento e capacidade de crescer sem perder o controle.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer centralizar todos os seus WhatsApp?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect conecta múltiplos números em uma central única com histórico, equipes e métricas separadas por canal.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
