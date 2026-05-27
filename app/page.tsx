import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex max-w-xl justify-center">
          <BrandLogo className="h-auto w-full max-w-lg object-contain" />
        </div>
        <p className="mt-8 text-sm font-semibold text-emerald-700">ShamarConnect MVP</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Inbox, CRM e IA comercial para WhatsApp.</h1>
        <p className="mt-4 text-slate-600">Acesse o dashboard para acompanhar conexões, conversas, funil e automações.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" href="/dashboard">Abrir dashboard</Link>
          <Link className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/settings/whatsapp">Conectar WhatsApp</Link>
        </div>
      </div>
    </main>
  );
}
