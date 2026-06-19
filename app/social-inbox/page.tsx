export default function SocialInboxPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Social Inbox</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Fila unificada de atendimento por canais sociais — DM, mensagens privadas e WhatsApp individual.
      </p>

      <div className="flex flex-col gap-4">
        {[
          {
            label: "WhatsApp Individual",
            description: "Conversas via WhatsApp Web gateway (Hall, Lips) e Cloud API (Shamar Kids)",
            href: "/whatsapp-messages",
            status: "ativo",
            statusColor: "bg-emerald-500",
          },
          {
            label: "Telegram Privado",
            description: "Mensagens diretas pelo bot Telegram — resposta manual via central",
            href: null,
            status: "em preparação",
            statusColor: "bg-amber-500",
          },
          {
            label: "Instagram DM",
            description: "Mensagens diretas do Instagram Professional via Meta Messaging API",
            href: null,
            status: "em preparação",
            statusColor: "bg-amber-500",
          },
        ].map((item) => (
          <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${item.statusColor}`} />
                <span className="font-semibold text-white">{item.label}</span>
                <span className="text-xs text-zinc-500">— {item.status}</span>
              </div>
              <p className="text-sm text-zinc-400">{item.description}</p>
            </div>
            {item.href ? (
              <a
                href={item.href}
                className="flex-shrink-0 text-xs bg-teal-700 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Abrir
              </a>
            ) : (
              <span className="flex-shrink-0 text-xs bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded-lg">
                Em breve
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Regra de ouro — broadcast ≠ atendimento</h2>
        <div className="text-sm text-zinc-400 space-y-2">
          <p>
            <strong className="text-zinc-200">Grupos e canais informativos</strong> são apenas para divulgar conteúdo (artigos, eventos).
            Nunca para atendimento individual.
          </p>
          <p>
            <strong className="text-zinc-200">Atendimento</strong> acontece somente em DM, WhatsApp individual, Telegram privado e Instagram DM.
          </p>
          <p className="text-zinc-500 text-xs">
            Use a <a href="/distribution" className="text-teal-400 hover:underline">Central de Distribuição</a> para publicar em grupos informativos.
          </p>
        </div>
      </div>
    </div>
  );
}
