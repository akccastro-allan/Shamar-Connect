export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">ShamarConnect MVP</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Inbox, CRM e IA comercial para WhatsApp.</h1>
        <p className="mt-4 text-slate-600">Acesse o dashboard em <a className="font-medium text-emerald-700 underline" href="/dashboard">/dashboard</a>.</p>
      </div>
    </main>
  );
}
