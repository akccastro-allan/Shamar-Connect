import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como usar notas de cliente no CRM para nunca perder contexto",
  description:
    "A memória de um vendedor é falha. A memória de um sistema, não. Notas de cliente bem escritas transformam conversas passadas em contexto permanente — para qualquer pessoa da equipe.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">
          ← Voltar para o blog
        </Link>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
          CRM
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como usar notas de cliente no CRM para nunca perder contexto
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Atendente bom tem boa memória. Equipe boa tem bom sistema. Notas de cliente são o que transforma a informação que existe na cabeça de uma pessoa no conhecimento acessível para toda a empresa.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 7 min · Categoria: CRM · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>Imagine dois atendentes que recebem o mesmo cliente — alguém que comprou há 3 meses e está voltando para uma segunda compra.</p>

          <p>Atendente sem sistema: "Olá! Como posso te ajudar?" — começa do zero, sem saber nada sobre quem é o cliente, o que comprou, o que importa para ele.</p>

          <p>Atendente com notas de cliente: "Oi [nome]! Você havia comprado [produto] em março, certo? Como está indo? Posso te ajudar com algo novo?" — entra na conversa informado, personalizado, demonstrando memória e cuidado.</p>

          <p>O segundo atendente não tem memória sobrehumana. Tem um sistema. E notas bem escritas fazem toda a diferença nessa experiência.</p>

          <h2>O que são notas de cliente no CRM?</h2>

          <p>Notas são registros textuais livres feitos pelo atendente no perfil do cliente — informações que não estão no histórico de mensagens mas que são relevantes para o relacionamento comercial.</p>

          <p>São diferentes do histórico de conversa (que é automático e mostra as mensagens trocadas) e dos campos estruturados do CRM (nome, empresa, telefone, etapa). As notas existem para capturar o que nenhum campo ou conversa vai registrar automaticamente: o contexto humano do cliente.</p>

          <h2>Que tipo de informação merece uma nota?</h2>

          <p>A regra prática: qualquer informação que, se você soubesse da próxima vez que falasse com o cliente, tornaria a conversa mais relevante.</p>

          <p>Exemplos de notas que fazem diferença real:</p>

          <ul>
            <li><em>"Cliente tem urgência para resolver antes do final do mês — pagamento de boleto que fecha dia 30."</em></li>
            <li><em>"Prefere receber as informações por texto, não por áudio. Fica irritado com áudios longos."</em></li>
            <li><em>"Está avaliando com o sócio Paulo — ele quem toma a decisão final."</em></li>
            <li><em>"Já tentou uma solução concorrente que não funcionou. Evitar mencionar o produto deles."</em></li>
            <li><em>"É sensível a preço. Sempre começa com objeção de valor antes de decidir — é o processo dele, não rejeição real."</em></li>
            <li><em>"Indicado por [fulano] — tratar com atenção especial, potencial de mais indicações."</em></li>
          </ul>

          <p>Esse tipo de contexto é exatamente o que um atendente experiente acumula na memória depois de meses de relacionamento. Com notas, qualquer atendente tem acesso a esse contexto desde a primeira interação.</p>

          <h2>Como escrever notas que sejam realmente úteis?</h2>

          <p>Nota útil é objetiva, específica e acionável. Nota inútil é vaga, longa, ou tão óbvia que não acrescenta nada.</p>

          <p><strong>Inútil:</strong> "Cliente interessado em produtos."</p>
          <p><strong>Útil:</strong> "Interessado no plano avançado, mas questionou o custo mensal. Sensível a comparação com concorrente X."</p>

          <p><strong>Inútil:</strong> "Ligar de volta amanhã."</p>
          <p><strong>Útil:</strong> "Combinou retorno para amanhã às 14h para apresentar a proposta ao sócio. Não ligar antes disso."</p>

          <p>A diferença é que a nota útil tem informação que muda o comportamento do atendente. A inútil poderia ser de qualquer cliente.</p>

          <h2>Quando registrar a nota?</h2>

          <p>Imediatamente após o atendimento — enquanto o contexto ainda está fresco e os detalhes importantes ainda estão vivos na memória. Deixar para depois resulta em notas genéricas, porque os detalhes específicos evaporam rapidamente.</p>

          <p>Regra prática: antes de fechar a conversa no sistema, o atendente escreve uma nota de 1 a 3 linhas capturando o que foi aprendido sobre o cliente naquela interação. Não o que foi dito — o que foi aprendido.</p>

          <h2>Como notas protegem o negócio quando um atendente sai?</h2>

          <p>Esse é um dos valores mais subestimados das notas de cliente. Quando um atendente experiente sai da empresa, ele leva consigo meses de contexto acumulado sobre cada cliente que atendeu. Se esse contexto estava só na cabeça dele, foi embora junto.</p>

          <p>Com notas bem registradas, o histórico fica na empresa — não na pessoa. O próximo atendente que assumir aquele cliente vai ter acesso ao mesmo contexto que o anterior levou meses para construir. Isso reduz o impacto de turnover de forma significativa.</p>

          <h2>Qual é o tamanho ideal de uma nota?</h2>

          <p>Curta o suficiente para ser lida em 15 segundos. Se o atendente precisa ler 5 parágrafos antes de responder ao cliente, a nota é longa demais. O objetivo é que qualquer pessoa consiga absorver o contexto essencial rapidamente — não que seja um documento completo sobre o cliente.</p>

          <p>1 a 3 frases por nota. Novas notas são adicionadas com o tempo — não é necessário concentrar tudo numa nota enorme. Um perfil de cliente com 10 notas curtas ao longo do relacionamento é mais utilizável do que uma nota longa escrita uma vez.</p>

          <h2>Conclusão</h2>

          <p>Notas de cliente são uma das práticas mais simples e com maior impacto no CRM. Elas transformam atendimento transacional em relacionamento — porque o cliente percebe quando a empresa se lembra dele.</p>

          <p>O investimento é mínimo: 30 segundos por atendimento para registrar o contexto essencial. O retorno é cumulativo: cada nota que você escreve hoje vai tornar o próximo atendimento desse cliente melhor — independente de quem atender.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer que qualquer atendente entre em cada conversa informado?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect inclui CRM com notas de cliente integradas ao histórico de conversas — para que o contexto do cliente fique na empresa, não na memória de quem atendeu.
          </p>
          <Link
            href="/planos"
            className="mt-8 inline-flex rounded-full bg-[#2ABFAB] px-8 py-4 font-black text-white hover:bg-[#24a897] transition-colors"
          >
            Conhecer o ShamarConnect
          </Link>
        </div>
      </article>
    </main>
  );
}
