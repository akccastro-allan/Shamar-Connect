import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como saber se sua equipe esta perdendo vendas no WhatsApp",
  description:
    "Veja sinais de que sua equipe esta perdendo vendas no WhatsApp e como CRM, historico, funil e IA ajudam a corrigir isso.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">← Voltar para o blog</Link>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Vendas pelo WhatsApp</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como saber se sua equipe está perdendo vendas no WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Muitas vendas não são perdidas por falta de clientes, mas por falta de resposta, acompanhamento e controle comercial.
        </p>

        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min • Categoria: Vendas pelo WhatsApp • Palavra-chave: perdendo vendas no WhatsApp
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB]">
          <p>
            Muitas empresas acreditam que estão vendendo pouco por falta de clientes. Mas, em muitos casos, os clientes já estão chegando pelo WhatsApp. O problema é que parte dessas oportunidades se perde no atendimento.
          </p>
          <p>
            A venda pode ser perdida por demora na resposta, falta de follow-up, orçamento esquecido, atendente sobrecarregado ou ausência de controle sobre as conversas.
          </p>

          <h2>Clientes ficam sem resposta?</h2>
          <p>
            O primeiro sinal de perda comercial é a demora ou ausência de resposta. Quando o cliente chama e não recebe retorno rápido, ele pode procurar outro fornecedor.
          </p>
          <p>
            Se a equipe recebe muitas mensagens e não consegue responder tudo, a empresa pode estar perdendo vendas antes mesmo de iniciar a negociação.
          </p>

          <h2>Orçamentos ficam sem acompanhamento?</h2>
          <p>
            Outro sinal comum é o orçamento enviado sem retorno. A equipe manda preço, condições ou proposta e depois espera o cliente responder. Se ninguém acompanha, muitas oportunidades ficam paradas.
          </p>
          <p>
            Toda proposta enviada precisa ter próxima ação. Sem isso, a venda depende apenas da iniciativa do cliente.
          </p>

          <h2>Conversas importantes somem na lista?</h2>
          <p>
            O WhatsApp organiza conversas por mensagens recentes. Isso significa que uma conversa comercial importante pode descer rapidamente se outras mensagens chegarem depois.
          </p>
          <p>
            Se a equipe depende apenas da lista do WhatsApp, é provável que algumas oportunidades fiquem esquecidas.
          </p>

          <h2>A equipe sabe quem está responsável por cada cliente?</h2>
          <p>
            Quando ninguém sabe quem está cuidando de uma conversa, o atendimento fica confuso. Dois atendentes podem responder o mesmo cliente ou todos podem achar que outra pessoa respondeu.
          </p>
          <p>
            Toda oportunidade comercial precisa ter responsável.
          </p>

          <h2>Existem conversas paradas há muitos dias?</h2>
          <p>
            Conversas paradas são um alerta. Nem toda conversa parada é venda perdida, mas toda conversa parada precisa ser analisada.
          </p>
          <p>
            Pode ser um cliente aguardando retorno, uma proposta esquecida ou uma negociação sem andamento.
          </p>

          <h2>O gestor consegue ver as oportunidades abertas?</h2>
          <p>
            Se o gestor precisa perguntar manualmente para cada vendedor o que está acontecendo, existe falta de controle. Uma operação comercial saudável precisa mostrar oportunidades abertas, orçamentos enviados, clientes aguardando retorno e vendas fechadas ou perdidas.
          </p>

          <h2>Como o CRM ajuda a identificar perdas?</h2>
          <p>
            O CRM ajuda a transformar conversas em oportunidades acompanhadas. Com ele, a empresa consegue visualizar etapas, responsáveis, histórico e próximas ações.
          </p>
          <p>
            Se muitas oportunidades param em orçamento enviado, o problema pode estar no follow-up. Se param no primeiro contato, pode haver falha na abordagem ou demora na resposta.
          </p>

          <h2>Como a IA pode apoiar a equipe?</h2>
          <p>
            A inteligência artificial pode ajudar com resumo de conversas, sugestões de resposta e transcrição de áudios. Isso reduz o tempo gasto para entender o histórico e ajuda o atendente a responder com mais clareza.
          </p>

          <h2>Como o ShamarConnect ajuda?</h2>
          <p>
            O ShamarConnect ajuda empresas que vendem pelo WhatsApp a organizar atendimento, CRM, funil de vendas, histórico, responsáveis e recursos de IA. Com mais controle, a empresa consegue enxergar oportunidades abertas, acompanhar follow-ups e reduzir perdas comerciais.
          </p>

          <h2>Conclusão</h2>
          <p>
            Sua equipe pode estar perdendo vendas no WhatsApp sem perceber. Os sinais aparecem na demora para responder, nos orçamentos sem acompanhamento, nas conversas paradas e na falta de visão do gestor.
          </p>
          <p>
            Quando a empresa organiza atendimento, histórico, responsáveis e próximas ações, fica mais fácil enxergar onde as vendas estão sendo perdidas e corrigir o processo.
          </p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">Quer reduzir perdas nas vendas pelo WhatsApp?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Conheça os planos do ShamarConnect e veja como organizar oportunidades, responsáveis, histórico e follow-ups.
          </p>
          <Link href="/planos" className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white">
            Ver planos
          </Link>
        </div>
      </article>
    </main>
  );
}
