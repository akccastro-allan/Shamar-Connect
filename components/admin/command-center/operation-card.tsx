import Link from "next/link";
import { statusLabel, type CommandCenterStatus } from "@/lib/admin/command-center-config";

type OperationCardProps = {
  name: string;
  type: string;
  status: CommandCenterStatus;
  description: string;
  functionLabel?: string;
  channel?: string;
  href?: string;
  configHref?: string;
  stats?: Array<{ label: string; value: string | number }>;
};

function statusClass(status: CommandCenterStatus) {
  if (status === "active" || status === "production_initial" || status === "go_live") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "development" || status === "official_whatsapp_preparation") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function OperationCard({ name, type, status, description, functionLabel, channel, href, configHref, stats }: OperationCardProps) {
  return (
    <article className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{type}</p>
          <h3 className="mt-1 text-lg font-black text-[#1B2F5B]">{name}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(status)}`}>{statusLabel(status)}</span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {functionLabel && <p className="mt-2 text-xs font-bold text-slate-500">Função: {functionLabel}</p>}
      {channel && <p className="mt-1 text-xs font-bold text-slate-500">Canal principal: {channel}</p>}

      {stats && stats.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="font-black text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {href && (
          <Link href={href} className="rounded-full bg-[#2ABFAB] px-4 py-2 text-xs font-black text-white hover:bg-[#229d8e]">
            Abrir
          </Link>
        )}
        {configHref && (
          <Link href={configHref} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
            Configurar
          </Link>
        )}
      </div>
    </article>
  );
}
