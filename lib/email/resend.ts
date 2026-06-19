import { Resend } from "resend";

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(apiKey);
}

export async function sendPasswordRecoveryEmail(to: string, recoveryLink: string) {
  const resend = createResendClient();

  await resend.emails.send({
    from: "ShamarConnect <noreply@shamarconnect.com.br>",
    to,
    subject: "Recuperação de senha — ShamarConnect",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <img src="https://shamarconnect.com.br/logo.png" alt="ShamarConnect" style="height:40px;margin-bottom:24px" />
        <h2 style="color:#1B2F5B;margin:0 0 12px">Recuperação de senha</h2>
        <p style="color:#475569;line-height:1.6;margin:0 0 24px">
          Recebemos uma solicitação para redefinir a senha da sua conta.<br/>
          Clique no botão abaixo para cadastrar uma nova senha.
        </p>
        <a href="${recoveryLink}"
           style="display:inline-block;background:#2ABFAB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:700;font-size:15px">
          Cadastrar nova senha
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;line-height:1.6">
          Se você não solicitou a recuperação, ignore este e-mail.<br/>
          Este link expira em 1 hora.
        </p>
      </div>
    `,
  });
}
