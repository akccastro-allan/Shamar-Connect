"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

type Diagnostics = {
  ok: boolean;
  configured: boolean;
  envStatus: {
    accessToken: boolean;
    phoneNumberId: boolean;
    businessAccountId: boolean;
    verifyToken: boolean;
    appSecret: boolean;
  };
  phoneNumberIdPartial: string | null;
  phoneStatus: {
    id: string;
    displayPhoneNumber: string;
    verifiedName: string;
    qualityRating: string;
    status: string;
  } | null;
  phoneStatusError: string | null;
  recentMessages: Array<{ id: string; direction: string; body: string | null; message_type: string; created_at: string }>;
  recentEvents: Array<{ id: string; event: string; processing_status: string; created_at: string }>;
  checkedAt: string | null;
};

function Row({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-700">{label}</span>
      <div className="flex items-center gap-2">
        {note && <span className="text-xs text-zinc-400">{note}</span>}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          {ok ? "OK" : "Ausente"}
        </span>
      </div>
    </div>
  );
}

export function WhatsappCloudSettingsPanel() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp-cloud/diagnostics");
      const json = await res.json();
      if (json.ok) setData(json);
      else setError(json.error || "Falha ao carregar");
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/whatsapp-cloud/webhook`
    : "/api/whatsapp-cloud/webhook";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">WhatsApp Cloud API</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Canal: Shamar Kids · Provider: whatsapp_cloud</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>
      )}

      {/* Env vars checklist */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-800 mb-3">Variáveis de ambiente</h2>
        {data ? (
          <div>
            <Row label="WHATSAPP_CLOUD_ACCESS_TOKEN" ok={data.envStatus.accessToken} />
            <Row label="WHATSAPP_CLOUD_PHONE_NUMBER_ID" ok={data.envStatus.phoneNumberId} note={data.phoneNumberIdPartial || undefined} />
            <Row label="WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID" ok={data.envStatus.businessAccountId} />
            <Row label="WHATSAPP_CLOUD_VERIFY_TOKEN" ok={data.envStatus.verifyToken} />
            <Row label="WHATSAPP_CLOUD_APP_SECRET (opcional)" ok={data.envStatus.appSecret} />
          </div>
        ) : (
          <div className="text-sm text-zinc-400">Carregando…</div>
        )}
      </div>

      {/* Phone number status */}
      {data?.phoneStatus && (
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-800 mb-3">Número conectado</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Número</span>
              <span className="font-medium">+{data.phoneStatus.displayPhoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Nome verificado</span>
              <span className="font-medium">{data.phoneStatus.verifiedName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Qualidade</span>
              <span className="font-medium">{data.phoneStatus.qualityRating}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Status Meta</span>
              <span className={`font-semibold ${data.phoneStatus.status === "CONNECTED" ? "text-emerald-600" : "text-amber-600"}`}>
                {data.phoneStatus.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {data?.phoneStatusError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Meta API:</strong> {data.phoneStatusError}
        </div>
      )}

      {/* Webhook URL */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-800 mb-1">URL do Webhook</h2>
        <p className="text-xs text-zinc-500 mb-3">Cadastrar em Meta Business &gt; WhatsApp &gt; Configuração &gt; Webhook</p>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 font-mono text-xs text-zinc-700 break-all select-all">
          {webhookUrl}
        </div>
        <p className="text-xs text-zinc-400 mt-2">Subscribe para: <code>messages</code></p>
      </div>

      {/* Setup checklist */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-800 mb-3">Checklist de configuração</h2>
        <ol className="space-y-2 text-sm">
          {[
            { label: "Token de acesso configurado (env var)", done: data?.envStatus.accessToken },
            { label: "Phone Number ID configurado (env var)", done: data?.envStatus.phoneNumberId },
            { label: "Verify Token configurado (env var)", done: data?.envStatus.verifyToken },
            { label: "Webhook cadastrado na Meta", done: null, note: "verificar manualmente" },
            { label: "Assinatura do webhook validada (GET /webhook recebeu hub.challenge)", done: null, note: "verificar logs" },
            { label: "Número de telefone verificado pela Meta", done: null, note: "processo manual no Meta Business Manager" },
            { label: "App em modo Live (não Sandbox)", done: null, note: "verificar no painel Meta" },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                item.done === true ? "bg-emerald-500 text-white" :
                item.done === false ? "bg-red-500 text-white" :
                "bg-zinc-200 text-zinc-500"
              }`}>
                {item.done === true ? "✓" : item.done === false ? "✗" : "?"}
              </span>
              <div>
                <span className="text-zinc-800">{item.label}</span>
                {item.note && <span className="text-zinc-400 ml-1">— {item.note}</span>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Children safety notice */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
        <h2 className="font-semibold text-amber-900 mb-2">Proteção de crianças — Shamar Kids</h2>
        <ul className="text-sm text-amber-800 space-y-1 list-disc pl-4">
          <li>Comunicação dirigida a pais e responsáveis, não às crianças diretamente.</li>
          <li>Não solicitar documentos de crianças via WhatsApp.</li>
          <li>Não coletar dados sensíveis de menores no chat.</li>
          <li>IA apenas sugere respostas — humano revisa e aprova.</li>
          <li>Nenhuma mensagem automática enviada sem opt-in explícito do responsável.</li>
          <li>Não disparar mensagens em massa.</li>
        </ul>
      </div>
    </div>
  );
}
