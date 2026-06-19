import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como montar uma equipe de atendimento no WhatsApp do zero",
  description:
    "Contratar mais uma pessoa e passar o celular não é montar equipe. É criar caos em escala maior. Veja como estruturar funções, processos e ferramentas antes de crescer.",
};

export default function ArticlePage() {
  return (
    <main className="bg-white">
      <article className="mx-auto max-w-4xl px-5 py-20 md:px-8 lg:py-28">
        <Link href="/blog" className="font-black text-[#2ABFAB]">
          ← Voltar para o blog
        </Link>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">
          Atendimento
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
          Como montar uma equipe de atendimento no WhatsApp do zero
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Crescer de um atendente para uma equipe é um ponto de inflexão perigoso. Sem processo definido antes de contratar, cada nova pessoa adiciona variação — e variação em atendimento significa cliente recebendo experiências diferentes da mesma empresa.
        </p>
        <div className="mt-10 rounded-[2rem] bg-[#F8FAFC] p-6 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          Tempo de leitura: 9 min · Categoria: Atendimento · Publicado em 19/06/2026
        </div>

        <div className="prose prose-slate mt-12 max-w-none prose-headings:font-black prose-headings:text-[#1B2F5B] prose-p:leading-8 prose-a:font-bold prose-a:text-[#2ABFAB] prose-li:leading-8">
          <p>A história se repete em quase todas as empresas que crescem pelo WhatsApp: começa com o fundador atendendo tudo. Volume aumenta, ele passa o celular para um funcionário de confiança. Volume aumenta de novo, ele passa para mais um. Cada um atende do jeito que acha certo. O gestor perde visibilidade. A qualidade fica inconsistente. Clientes que caem no "bom atendente" ficam satisfeitos. Os que caem no outro, não.</p>

          <p>O problema não é a pessoa contratada — é a ausência de processo antes de contratar.</p>

          <h2>O que definir antes de contratar o primeiro atendente?</h2>

          <p>Antes de qualquer contratação, três coisas precisam existir: o processo de atendimento documentado, a ferramenta onde o atendimento vai acontecer (não pode ser o celular pessoal de cada um), e os critérios de qualidade que definem o que é um bom atendimento na sua empresa.</p>

          <p>Sem esses três elementos, você não está montando uma equipe — está delegando o caos.</p>

          <p><strong>O processo documenta:</strong> como qualificar um novo contato, quais perguntas fazer, como enviar uma proposta, como escalar para o gestor, como encerrar um atendimento. Não precisa ser um manual de 50 páginas. Um guia de uma página com o fluxo básico já faz enorme diferença.</p>

          <p><strong>A ferramenta centraliza:</strong> quando o atendimento está no celular pessoal de cada atendente, o histórico está fragmentado. Se alguém sair, o histórico vai junto. Se alguém estiver doente, outro atendente não consegue cobrir sem começar do zero. A plataforma de atendimento precisa ser o sistema central — não o WhatsApp de cada um.</p>

          <p><strong>Os critérios de qualidade definem:</strong> tom de voz (formal ou informal?), tempo máximo de resposta, o que pode ser resolvido pelo atendente e o que precisa subir para o gestor, e como registrar o resultado de cada conversa.</p>

          <h2>Quais funções uma equipe pequena precisa?</h2>

          <p>Para times de 2 a 4 pessoas, a divisão mais funcional é simples:</p>

          <ul>
            <li><strong>Atendente:</strong> responsável pelo contato direto com o cliente, desde o primeiro "olá" até o encerramento ou a venda. É quem lida com a maioria das conversas do dia.</li>
            <li><strong>Líder ou responsável:</strong> garante que o processo está sendo seguido, resolve situações que fogem do padrão, monitora qualidade e métricas. Em times pequenos, essa pessoa também atende — mas com um papel adicional de supervisão.</li>
          </ul>

          <p>Quando o time cresce para 5 ou mais pessoas, começa a fazer sentido separar atendimento comercial (foco em venda) de suporte (foco em resolver problemas de quem já comprou). As habilidades e métricas são diferentes, e misturar os dois num único papel divide o foco.</p>

          <h2>Como fazer o onboarding de um novo atendente de forma que realmente funcione?</h2>

          <p>Onboarding de atendente no WhatsApp tem três etapas que precisam acontecer em sequência, não em paralelo:</p>

          <p><strong>Etapa 1 — Imersão no produto e no cliente (dias 1 e 2):</strong> o novo atendente precisa entender profundamente o que a empresa vende, quem compra, por que compra, e quais são as dúvidas e objeções mais comuns. Isso não se aprende em treinamento — se aprende lendo conversas reais de atendimentos anteriores.</p>

          <p><strong>Etapa 2 — Atendimento supervisionado (dias 3 a 10):</strong> o atendente começa a responder, mas o líder revisa todas as respostas antes de enviar. Isso parece lento, mas é o período mais valioso. Erros corrigidos aqui não chegam ao cliente.</p>

          <p><strong>Etapa 3 — Autonomia com revisão periódica (da segunda semana em diante):</strong> o atendente opera de forma independente, mas o líder revisa uma amostra de conversas por semana. Feedback regular, não só quando algo dá errado.</p>

          <p>O erro mais comum é pular para a etapa 3 diretamente. O atendente parece capaz, o gestor está ocupado, e ele começa a atender sozinho sem ter passado pela calibração necessária. Depois de duas semanas, os primeiros problemas aparecem.</p>

          <h2>Como distribuir conversas para que ninguém fique sobrecarregado?</h2>

          <p>Existem dois modelos principais de distribuição, e cada um tem prós e contras:</p>

          <p><strong>Rodízio automático:</strong> cada nova conversa vai para o próximo atendente disponível, em sequência. Simples, justo em volume, fácil de implementar. O problema é que ignora especialização — um atendente focado em suporte pode receber uma conversa de venda que ele não está preparado para conduzir.</p>

          <p><strong>Distribuição por tipo:</strong> conversas são categorizadas (venda, suporte, reclamação, financeiro) e vão para o atendente certo para aquele tipo. Mais eficiente em qualidade, mas exige uma triagem inicial para categorizar cada conversa.</p>

          <p>Para times pequenos, o rodízio simples funciona bem como ponto de partida. À medida que o time cresce e as especializações ficam mais claras, a distribuição por tipo passa a fazer mais sentido.</p>

          <h2>Como manter a qualidade quando a equipe cresce?</h2>

          <p>Qualidade em atendimento não se mantém sozinha. Ela precisa de revisão ativa, feedback frequente e indicadores que mostrem o que está funcionando e o que não está.</p>

          <p>Uma rotina que funciona bem para times de até 10 pessoas: revisão semanal de 5 a 10 conversas aleatórias por atendente, uma reunião breve de 20 minutos para feedback coletivo, e acompanhamento mensal de métricas individuais (tempo de resposta, taxa de resolução, satisfação quando possível).</p>

          <p>O objetivo dessa revisão não é fiscalizar — é melhorar. Atendentes que recebem feedback construtivo e específico melhoram muito mais rápido do que os que só recebem elogios genéricos ou críticas quando algo já virou problema.</p>

          <h2>Qual é o maior erro de quem monta equipe de atendimento pela primeira vez?</h2>

          <p>Confiar demais na intuição de que "a pessoa é boa, vai se virar". Atendente talentoso sem processo é como um ótimo chef sem receita — funciona bem quando está inspirado, falha quando está com pressa, e não escala para uma cozinha de 10 pessoas.</p>

          <p>Processo bom com atendente mediano supera atendente excepcional sem processo — especialmente quando o volume cresce e a consistência passa a ser mais importante do que a excelência isolada.</p>

          <h2>Conclusão</h2>

          <p>Montar uma equipe de atendimento no WhatsApp que funciona de verdade exige investimento em processo antes de investimento em pessoas. Isso parece contra-intuitivo — a tendência natural é contratar e resolver. Mas as equipes que mais rapidamente estabilizam são as que constroem o processo junto com o crescimento, não depois que os problemas aparecem.</p>

          <p>Comece com um guia de atendimento de uma página, uma plataforma centralizada que todos usam, e um critério claro do que é uma conversa bem resolvida. Com esses três elementos, qualquer nova contratação vai ter base para crescer.</p>
        </div>

        <div className="mt-14 rounded-[2rem] bg-[#1B2F5B] p-8 text-center text-white md:p-12">
          <h2 className="text-3xl font-black">
            Quer uma plataforma que centraliza toda a equipe em um só lugar?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            O ShamarConnect organiza atendentes, histórico, distribuição de conversas e supervisão em uma central única — pronta para crescer junto com a sua equipe.
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
