import Link from "next/link";

const cases = [
  {
    empresa: "Hall Donous",
    segmento: "Moda masculina",
    status: "Em operação",
    accent: "#132B57",
    teaser:
      "Organização de atendimento, clientes e oportunidades comerciais que chegam pelo WhatsApp.",
    href: null,
  },
  {
    empresa: "Viciados em Trilhas",
    segmento: "Turismo e experiências",
    status: "Em operação",
    accent: "#2ABFAB",
    teaser:
      "Centralização de inscrições, confirmações e comunicação de grupos sem misturar atendimento individual.",
    href: null,
  },
  {
    empresa: "MK Shalom",
    segmento: "Comunidade e eventos",
    status: "Em preparação",
    accent: "#C9952A",
    teaser:
      "Organização de comunicação com membros, confirmações e acompanhamento por etapas.",
    href: null,
  },
  {
    empresa: "Oriahfin",
    segmento: "Financeiro",
    status: "Em preparação",
    accent: "#13796D",
    teaser:
      "CRM e WhatsApp integrados para acompanhar clientes, solicitações e processos financeiros.",
    href: null,
  },
];

export function BlogCasosReais() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Casos reais</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#132B57] md:text-5xl">
            Operações que ajudam a construir o produto.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Estudos de caso baseados em uso real. Os conteúdos completos serão publicados conforme as operações amadurecem.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((item) => (
            <article
              key={item.empresa}
              className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70"
            >
              <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: item.accent }} />
              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.segmento}</p>
                <h3 className="mt-2 text-xl font-black text-[#132B57]">{item.empresa}</h3>
              </div>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                  item.status === "Em operação"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {item.status}
              </span>

              <p className="mt-4 text-sm leading-6 text-slate-600">{item.teaser}</p>

              {item.href ? (
                <Link href={item.href} className="mt-5 inline-flex text-sm font-black text-[#13796D] hover:underline">
                  Ler caso completo →
                </Link>
              ) : (
                <p className="mt-5 text-xs font-bold text-slate-400">Publicação em breve</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
