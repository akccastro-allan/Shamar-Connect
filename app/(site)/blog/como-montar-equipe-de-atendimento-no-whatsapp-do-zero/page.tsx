import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como montar uma equipe de atendimento no WhatsApp do zero",
  description: "Contratar pessoas para atender no WhatsApp sem processo é desperdiçar potencial. Veja como estruturar funções, processos e ferramentas para um time que funciona.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Atendimento</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como montar uma equipe de atendimento no WhatsApp do zero
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Crescer de um atendente para uma equipe exige mais do que contratar. Exige processo, ferramenta e gestão. Sem os três, a qualidade cai com o crescimento.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 8 min • Categoria: Atendimento • Palavra-chave: equipe atendimento WhatsApp estrutura
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>A maioria das empresas começa com o fundador ou uma única pessoa atendendo pelo WhatsApp. Quando o volume cresce, a solução imediata é contratar mais alguém e passar o celular. E aí começa o problema.</p>
          <p>Sem processo definido, cada pessoa atende do jeito que acha certo. O histórico fica fragmentado. O gestor perde visibilidade. A qualidade cai exatamente no momento em que mais clientes chegam.</p>

          <h2>O que definir antes de contratar?</h2>
          <p>Antes de adicionar pessoas, a empresa precisa ter clareza sobre três coisas: qual é o processo de atendimento (como qualificar, como responder, como escalar), qual é a ferramenta onde o atendimento vai acontecer (não pode ser o celular pessoal de cada um), e quais são as métricas que definem um bom atendimento.</p>
          <p>Contratar sem essas respostas é criar caos mais rápido.</p>

          <h2>Quais funções uma equipe de atendimento precisa?</h2>
          <p>Para times pequenos (2 a 5 pessoas), a divisão mais simples é: atendente (responsável pelo contato com o cliente), supervisor ou líder (garante qualidade e resolve escaladas). Para times maiores, pode fazer sentido separar atendimento comercial de suporte, e ter alguém dedicado à gestão de fila e distribuição.</p>

          <h2>Como fazer o onboarding de um novo atendente?</h2>
          <p>Três elementos essenciais: acesso às ferramentas (plataforma de atendimento, não o número pessoal), leitura do guia de atendimento (o que dizer, como dizer, o que não fazer), e acompanhamento supervisionado nas primeiras semanas. O novo atendente deve poder revisar conversas de referência para ver como o padrão funciona na prática.</p>

          <h2>Como distribuir as conversas para a equipe?</h2>
          <p>A distribuição por rodízio automático é a mais simples: cada nova conversa vai para o próximo atendente disponível. Mas dependendo do negócio, pode fazer sentido distribuir por especialidade (suporte vs. vendas), por idioma, por região ou por cliente (atendentes fixos para clientes recorrentes).</p>

          <h2>Como manter a qualidade com o crescimento?</h2>
          <p>Revisão periódica de conversas, feedback regular, e indicadores de desempenho por atendente. A qualidade não se mantém sozinha — ela precisa ser medida e gerenciada ativamente à medida que a equipe cresce.</p>

          <h2>Conclusão</h2>
          <p>Uma equipe de atendimento eficaz no WhatsApp não é fruto de boas contratações isoladas. É resultado de processo, ferramenta e gestão trabalhando juntos. Investir nisso antes de crescer é muito mais barato do que corrigir depois.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer estruturar sua equipe de atendimento?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect oferece plataforma multi-atendente com distribuição, supervisão e histórico centralizado para times de qualquer tamanho.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
