import Link from "next/link";
import { metaReadinessItems, type MetaReadinessStatus } from "@/lib/admin/command-center-config";

function readinessClass(status: MetaReadinessStatus) {
  const classes: Record<MetaReadinessStatus, string> = {
    pending: "border-slate-200 bg-slate-50 text-slate-600",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blocked: "border-red-200 bg-red-50 text-red-700",
  };

  return classes[status];
}

function readinessLabel(status: MetaReadinessStatus) {
  const labels: Record<MetaReadinessStatus, string> = {
    pending: "pendente",
    in_progress: "em andamento",
    ready: "pronto",
    blocked: "bloqueado",
  };

  return labels[status];
}

export function MetaReadinessCard() {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#C9952A]">Preparação oficial</p>
          <h2 className="mt-1 text-2xl font-black text-[#1B2F5B]">WhatsApp Oficial / Meta Partner</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Preparação para WhatsApp Oficial e futura trilha de parceria Meta. Shamar Kids é o primeiro caso oficial futuro. Lips continua no WhatsApp Conectado / OpenWA.
            O sistema ainda não deve comunicar que é Partner Meta.
          </p>
        </div>
        <Link href="/settings/whatsapp-cloud" className="w-fit rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">
          Ver WhatsApp Oficial
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="font-black text-slate-800">Separação comercial dos canais</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <p className="font-black text-[#1B2F5B]">WhatsApp Conectado</p>
              <p className="mt-2 text-sm text-slate-500">OpenWA / WhatsApp Web Gateway para MVP, validação e operação rápida.</p>
              <p className="mt-2 text-xs font-bold text-slate-500">Exemplo atual: Lips.</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="font-black text-[#1B2F5B]">WhatsApp Oficial</p>
              <p className="mt-2 text-sm text-slate-500">Meta WhatsApp Business Platform / Cloud API para conformidade, escala e templates.</p>
              <p className="mt-2 text-xs font-bold text-slate-500">Exemplo futuro: Shamar Kids.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="font-black text-slate-800">Readiness</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {metaReadinessItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${readinessClass(item.status)}`}>{readinessLabel(item.status)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
