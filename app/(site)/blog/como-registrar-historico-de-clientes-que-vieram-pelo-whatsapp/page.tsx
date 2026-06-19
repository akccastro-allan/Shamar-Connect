import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como registrar o histórico de clientes que vieram pelo WhatsApp",
  description:
    "O histórico de clientes que fica só no WhatsApp está no aparelho de quem atendeu — não na empresa. Troca de celular, saída de atendente, ou exclusão acidental, e sumiu.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">
          ← Voltar para o blog
        </Link>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
          Organização
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como registrar o histórico de clientes que vieram pelo WhatsApp
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Clientes que chegam pelo WhatsApp raramente entram num CRM. O histórico fica nas conversas — e quando o atendente muda de celular ou sai da empresa, vai junto. Isso é um risco que a maioria das empresas não percebe até ser tarde.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 8 min · Categoria: Organização · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>O WhatsApp é excelente para comunicação em tempo real. Péssimo para guardar e organizar histórico de clientes. As conversas ficam no aparelho de quem atendeu, sem estrutura, sem acesso para outros membros da equipe, e sem nenhum metadado além do texto das mensagens.</p>

          <p>Durante meses ou anos, uma empresa vai acumulando histórico valioso — o que cada cliente comprou, quando, por quanto, o que ficou satisfeito, o que não ficou, qual é o processo de decisão de cada um. Tudo isso existe — fragmentado em centenas de conversas de WhatsApp espalhadas em aparelhos de atendentes.</p>

          <p>E então alguém troca de celular. Ou sai da empresa. E esse histórico vai embora.</p>

          <h2>Por que o WhatsApp não é suficiente como sistema de histórico?</h2>

          <p>Três razões estruturais:</p>

          <p><strong>Acesso restrito.</strong> O histórico de uma conversa está no aparelho da pessoa que atendeu — e só lá. Se outro atendente precisa saber o que foi combinado com esse cliente, não consegue. Se o gestor quer rever uma conversa antiga para entender o contexto de uma reclamação, não consegue. O histórico é uma ilha.</p>

          <p><strong>Busca ineficiente.</strong> Encontrar uma informação específica numa conversa do WhatsApp exige lembrar aproximadamente quando aconteceu, quem era o contato, e rolar manualmente. Isso é viável para 10 clientes. Inviável para 500.</p>

          <p><strong>Ausência de estrutura.</strong> O WhatsApp armazena mensagens — não contexto. Não há campo para "valor da compra", "produto adquirido", "data de renovação", "grau de satisfação", "próxima ação". Toda essa informação existe, mas está implícita nas mensagens — e extraí-la é trabalhoso.</p>

          <h2>O que deve ser registrado no histórico de um cliente?</h2>

          <p>Não é necessário registrar tudo — mas existe um conjunto mínimo que transforma um contato anônimo num cliente conhecido:</p>

          <p><strong>Informações de identificação:</strong> nome, telefone, empresa (se for B2B), como chegou (indicação de quem, qual canal).</p>

          <p><strong>Histórico de compras:</strong> o que comprou, quando, qual valor, como pagou, se houve algum problema. Esse histórico permite calcular LTV (valor total do cliente), identificar padrões de recompra, e fazer ofertas relevantes no momento certo.</p>

          <p><strong>Histórico de atendimento:</strong> principais interações, problemas que relatou, como foram resolvidos. Esse histórico protege a empresa — você sabe o que foi prometido, quando, e por quem.</p>

          <p><strong>Contexto relevante:</strong> o que é importante saber sobre esse cliente que não está nas mensagens. Processo de decisão, preferências de comunicação, sensibilidade a preço, quem mais participa das decisões.</p>

          <h2>Como criar o hábito de registro sem travar o atendimento?</h2>

          <p>Aqui está a tensão: registrar histórico leva tempo, e atendentes que estão com o volume alto não vão parar para preencher formulários detalhados entre uma conversa e outra.</p>

          <p>A solução é gradualismo intencional. Comece com o mínimo absoluto: nome, telefone, e como o cliente chegou. Esses três campos já são muito melhor do que nada, e levam menos de 30 segundos para preencher no primeiro contato.</p>

          <p>À medida que a rotina se consolida, adicione um campo por vez — sempre que um campo novo seja justificado por uma pergunta que o gestor faz frequentemente mas não consegue responder. "De onde estão vindo nossos clientes?" justifica o campo origem. "Quais clientes compraram mais de uma vez?" justifica o histórico de compras.</p>

          <h2>Como a integração entre WhatsApp e CRM simplifica o registro?</h2>

          <p>Com uma plataforma que centraliza atendimento e CRM no mesmo lugar, parte do registro acontece automaticamente. O histórico de conversas já está lá — o atendente só precisa adicionar o que o sistema não captura sozinho: as notas de contexto, o valor da venda, a etapa do funil.</p>

          <p>Isso reduz o trabalho manual de forma significativa e aumenta a consistência — porque o contexto de cada conversa está visível enquanto o atendente preenche os campos, em vez de precisar lembrar de memória.</p>

          <h2>Como o histórico registrado gera vendas futuras?</h2>

          <p>Histórico de cliente é mais do que proteção contra perda de informação. É uma fonte ativa de oportunidades de venda:</p>

          <ul>
            <li>Saber quem comprou produto A e tem perfil para comprar produto B.</li>
            <li>Identificar clientes que compraram há 60 dias e podem precisar de reposição.</li>
            <li>Reconhecer clientes que ficaram insatisfeitos numa compra anterior — e abordar de forma proativa antes que eles precisem reclamar.</li>
            <li>Calcular o LTV médio por canal de aquisição — para saber onde investir mais em captação.</li>
          </ul>

          <p>Nenhuma dessas análises é possível sem histórico registrado. E todas elas, com histórico disponível, se tornam ações comerciais direcionadas que geram retorno real.</p>

          <h2>Conclusão</h2>

          <p>Histórico de cliente é um ativo da empresa — não do atendente, não do celular, não do WhatsApp. Registrá-lo de forma centralizada e estruturada protege esse ativo contra perda, permite que qualquer atendente ofereça atendimento personalizado, e abre oportunidades de venda que a empresa não enxergaria sem esses dados.</p>

          <p>O processo de registro não precisa ser perfeito desde o início. Precisa começar — com o mínimo, de forma consistente, e crescer com o tempo.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer centralizar o histórico de todos os seus clientes do WhatsApp?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect integra WhatsApp e CRM para que o histórico de cada cliente fique na empresa — não espalhado em aparelhos de atendentes.
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
