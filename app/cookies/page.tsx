import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata = {
  title: "Política de Cookies — ShamarConnect",
  description: "Como o ShamarConnect utiliza cookies e tecnologias similares.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="ShamarConnect">
            <BrandLogo variant="mark" className="h-10 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
            <Link href="/termos" className="hover:text-[#1B2F5B]">Termos</Link>
            <Link href="/privacidade" className="hover:text-[#1B2F5B]">Privacidade</Link>
            <Link href="/login" className="rounded-full bg-[#1B2F5B] px-4 py-2 text-white">Entrar</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C9952A]">Documento legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#1B2F5B]">Política de Cookies</h1>
        <p className="mt-3 text-slate-500">Última atualização: 20 de junho de 2026</p>

        <div className="prose prose-slate mt-10 max-w-none">

          <h2>1. O que são cookies</h2>
          <p>
            Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você acessa um site. Eles permitem que a aplicação reconheça seu navegador em visitas subsequentes, mantendo preferências e sessões autenticadas.
          </p>

          <h2>2. Cookies que utilizamos</h2>

          <h3>Cookies essenciais (obrigatórios)</h3>
          <p>Esses cookies são necessários para o funcionamento básico da plataforma e não podem ser desabilitados.</p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Nome</th>
                  <th className="py-2 pr-4 text-left font-semibold">Finalidade</th>
                  <th className="py-2 text-left font-semibold">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">shamar_connect_session</td>
                  <td className="py-2 pr-4">Autenticação e controle de sessão do usuário. Contém identidade criptografada com HMAC-SHA256.</td>
                  <td className="py-2">Sessão (até logout)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Cookies de autenticação</h3>
          <p>
            O cookie de sessão <code>shamar_connect_session</code> é assinado digitalmente (HMAC-SHA256) e não contém dados sensíveis em texto claro. Ele identifica seu usuário e empresa de forma segura, sem armazenar senha ou dados pessoais diretamente no navegador.
          </p>

          <h3>Analytics e desempenho</h3>
          <p>
            Atualmente não utilizamos cookies de analytics de terceiros (como Google Analytics) na plataforma interna. O site público (<Link href="/" className="text-[#2ABFAB] underline">shamarconnect.com.br</Link>) pode utilizar ferramentas de analytics básicas sem coleta de dados pessoais identificáveis.
          </p>

          <h3>Cookies de preferências</h3>
          <p>
            Preferências de interface (como tema e configurações de visualização) podem ser armazenadas localmente no seu navegador via <code>localStorage</code>, sem envio ao servidor.
          </p>

          <h2>3. Cookies de terceiros</h2>
          <p>
            Ao utilizar funcionalidades de pagamento (Asaas), o provedor de pagamentos pode definir cookies próprios em seu domínio. Esses cookies são regidos pela política de privacidade do Asaas e não controlamos seu comportamento.
          </p>

          <h2>4. Como gerenciar cookies</h2>
          <p>
            Você pode gerenciar ou excluir cookies através das configurações do seu navegador. Observe que desabilitar cookies essenciais impedirá o login e o uso da plataforma.
          </p>
          <ul>
            <li><strong>Chrome:</strong> Configurações → Privacidade e segurança → Cookies e outros dados de sites</li>
            <li><strong>Firefox:</strong> Opções → Privacidade e Segurança → Cookies e dados de sites</li>
            <li><strong>Safari:</strong> Preferências → Privacidade → Gerenciar dados do site</li>
            <li><strong>Edge:</strong> Configurações → Cookies e permissões do site</li>
          </ul>

          <h2>5. Atualizações desta política</h2>
          <p>
            Esta política pode ser atualizada conforme evoluímos a plataforma. Alterações significativas serão comunicadas por e-mail ou notificação dentro do sistema.
          </p>

          <h2>6. Contato</h2>
          <p>
            Dúvidas sobre cookies e privacidade:{" "}
            <a href="mailto:privacidade@moriahsystems.com.br" className="text-[#2ABFAB] underline">
              privacidade@moriahsystems.com.br
            </a>
          </p>
        </div>
      </article>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-slate-500">
          <p>© 2026 Moriah Systems. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-[#1B2F5B]">Termos</Link>
            <Link href="/privacidade" className="hover:text-[#1B2F5B]">Privacidade</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
