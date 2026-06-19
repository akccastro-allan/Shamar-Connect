import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como usar etiquetas no CRM para organizar clientes por etapa",
  description: "Etiquetas no CRM são a forma mais rápida de categorizar clientes sem complicar o processo. Veja como usar com consistência para ganhar clareza no pipeline.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">CRM</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como usar etiquetas no CRM para organizar clientes por etapa
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Etiquetas bem definidas transformam uma lista caótica de contatos em um pipeline navegável. A chave é ter um sistema simples e seguir ele.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 6 min • Categoria: CRM • Palavra-chave: etiquetas CRM organização
        </div>
        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>Etiquetas (ou tags) são marcadores que você atribui a clientes para classificá-los rapidamente. Em vez de lembrar ou procurar quem está em qual etapa, você filtra pela etiqueta e vê todos de uma vez.</p>
          <p>O problema é que a maioria das empresas cria etiquetas demais, sem padrão, e acaba com um sistema inutilizável. A solução não é eliminar etiquetas — é ter um sistema intencionalmente simples.</p>

          <h2>Quais tipos de etiquetas fazem sentido?</h2>
          <p>Existem três categorias úteis. Etiquetas de etapa de venda (novo, qualificado, proposta enviada, negociando, fechado, perdido). Etiquetas de perfil de cliente (pessoa física, pequena empresa, médio porte, recorrente, indicação). Etiquetas de ação pendente (aguardando retorno, follow-up agendado, reativação).</p>
          <p>Não é necessário usar as três categorias ao mesmo tempo. Comece com as etiquetas de etapa — elas são as mais impactantes para visualizar o pipeline.</p>

          <h2>Como definir etiquetas com a equipe?</h2>
          <p>O maior risco de um sistema de etiquetas é cada atendente usar nomes diferentes para a mesma coisa. Um usa "Lead quente", outro usa "Interessado", outro usa "Hot lead". O resultado é fragmentação — ninguém sabe o que cada um significa.</p>
          <p>Defina as etiquetas oficiais, documente o significado de cada uma e garanta que a equipe inteira use exatamente as mesmas. Revisões periódicas ajudam a eliminar etiquetas criadas ad hoc que não fazem parte do sistema.</p>

          <h2>Etiquetas vs. colunas do Kanban: qual usar?</h2>
          <p>Colunas do Kanban representam o estágio atual do cliente no processo de venda — só pode estar em um por vez. Etiquetas são complementares: podem se acumular e representam características ou ações, não apenas estágio.</p>
          <p>Um cliente pode estar na coluna "Em negociação" e ter as etiquetas "indicação" e "follow-up agendado" ao mesmo tempo. As duas ferramentas juntas oferecem mais clareza do que qualquer uma isolada.</p>

          <h2>Como filtrar por etiqueta para agir?</h2>
          <p>O valor real das etiquetas aparece no momento de filtrar. "Mostre todos os clientes com a etiqueta 'proposta enviada' há mais de 5 dias" é o tipo de busca que identifica imediatamente quem precisa de follow-up. Sem etiquetas, essa busca é impossível.</p>

          <h2>Conclusão</h2>
          <p>Etiquetas bem usadas transformam o CRM de uma lista passiva em um sistema ativo de organização. O segredo está na simplicidade: poucas etiquetas, com significado claro, usadas consistentemente por toda a equipe.</p>
        </div>
        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer organizar seu pipeline com etiquetas?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">O ShamarConnect oferece CRM com etiquetas, Kanban e histórico integrado para que sua equipe nunca perca um cliente no funil.</p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">Ver planos</Link>
        </div>
      </article>
    </main>
  );
}
