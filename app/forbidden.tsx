import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5 text-slate-950">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">Acesso restrito</p>
        <h1 className="mt-3 text-3xl font-black text-[#1B2F5B]">Você não tem permissão para acessar esta área.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          O Centro de Comando é exclusivo para operador global da plataforma, sem vínculo com uma organização específica.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">
          Voltar para a central
        </Link>
      </section>
    </main>
  );
}
