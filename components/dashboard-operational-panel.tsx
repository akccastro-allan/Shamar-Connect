import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  ["Contatos CRM", "—", "base de relacionamento"],
  ["Conversas", "—", "histórico centralizado"],
  ["Mensagens", "—", "volume processado"],
  ["Importações", "—", "fontes comerciais"],
];

const actions = [
  ["Teste do sistema", "/system-test"],
  ["Configurações", "/settings/whatsapp"],
  ["Importação", "/whatsapp-import"],
  ["Contatos", "/contact-import"],
];

export function DashboardOperationalPanel() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[#1B2F5B] p-6 text-white shadow-xl lg:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-[#2ABFAB] text-white hover:bg-[#2ABFAB]">Operação comercial</Badge>
          <Badge variant="secondary">Sistema online</Badge>
        </div>
        <h2 className="mt-6 max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
          Central de controle do atendimento e vendas
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
          Visão executiva para acompanhar CRM, atendimentos, mensagens e próximas ações comerciais.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#2ABFAB] px-5 font-black text-white hover:bg-[#24aa98]">
            <Link href="/system-test">Verificar sistema</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-full font-black">
            <Link href="/settings/whatsapp">Configurar operação</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, helper]) => (
          <Card key={label} className="rounded-[1.5rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardDescription>{helper}</CardDescription>
              <CardTitle className="text-[#1B2F5B]">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-[#2ABFAB]">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map(([label, href]) => (
          <Card key={href} className="rounded-[1.5rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#1B2F5B]">{label}</CardTitle>
              <CardDescription>Acesse este recurso do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={href} className="inline-flex h-11 w-full items-center justify-center rounded-2xl border bg-white px-4 py-2 text-sm font-black text-[#1B2F5B] transition hover:bg-slate-50">
                Abrir
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
