import Link from "next/link";

const cases = [
  {
    empresa: "Hall Donous",
    segmento: "Moda masculina",
    status: "Em operação",
    color: "#1B2F5B",
    teaser: "Como o Hall Donous organizou o atendimento de clientes pelo WhatsApp e parou de perder oportunidades no caos de mensagens.",
    href: null,
  },
  {
    empresa: "Viciados em Trilhas",
    segmento: "Turismo e experiências",
    status: "Em operação",
    color: "#2ABFAB",
    teaser: "Como a Viciados em Trilhas centralizou inscrições, confirmações e comunicados de grupos sem misturar atendimento individual.",
    href: null,
  },
  {
    empresa: "MK Shalom",
    segmento: "Comunidade e eventos",
    status: "Em preparação",
    color: "#8B5CF6",
    teaser: "Como o MK Shalom vai usar o ShamarConnect para organizar comunicação com membros, confirmações e acompanhamento pastoral.",
    href: null,
  },
  {
    empresa: "Oriahfin",
    segmento: "Financeiro",
    status: "Em preparação",
    color: "#C9952A",
    teaser: "Como a Oriahfin planeja usar CRM e WhatsApp integrados para acompanhar clientes e processos financeiros.",
    href: null,
  },
];

export function BlogCasosReais() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#C9952A]">Casos Reais</p>
          <h2 className="mt-2 text-2xl font-black text-[#1B2F5B]">Empresas usando o ShamarConnect</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Estudos de caso baseados em uso real. Conteúdo em desenvolvimento — publicamos conforme a operação avança.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((c) => (
            <div
              key={c.empresa}
              className="rounded-[2rem] border bg-white p-6 shadow-sm"
              style={{ borderLeftColor: c.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{c.segmento}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">{c.empresa}</h3>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                  style={{
                    backgroundColor: c.status === "Em operação" ? "#DCFCE7" : "#F1F5F9",
                    color: c.status === "Em operação" ? "#166534" : "#64748B",
                  }}
                >
                  {c.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{c.teaser}</p>

              {c.href ? (
                <a href={c.href} className="mt-5 block text-sm font-black text-[#2ABFAB] hover:underline">
                  Ler caso completo →
                </a>
              ) : (
                <p className="mt-5 text-xs font-bold text-slate-400">Publicação em breve</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
