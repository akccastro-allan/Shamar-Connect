import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {badge ? (
              <Badge className="bg-[#2ABFAB] px-3 py-1 text-xs font-black text-white hover:bg-[#2ABFAB]">
                {badge}
              </Badge>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              ShamarConnect
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1B2F5B] md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            {description}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="font-black text-[#1B2F5B]">Ambiente ativo</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Painel preparado para operação, demonstração e acompanhamento comercial.
          </p>
        </div>
      </div>
    </div>
  );
}
