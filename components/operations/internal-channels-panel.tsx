"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INTERNAL_CHANNEL_PURPOSE_LABELS, INTERNAL_CHANNEL_PURPOSES } from "@/lib/operations/internal-channels";

type InternalOrganization = {
  id: string;
  name: string;
  slug: string | null;
  businessKey: string;
  businessLabel: string;
  nextSessions: Array<{ gatewayId: string; ok: boolean; sessionId?: string; error?: string }>;
};

type InternalGateway = {
  id: string;
  name: string;
  slug: string;
  provider: string;
  baseUrlMasked: string;
  environment: string;
  status: string;
  version: string | null;
  maxSessions: number;
  activeSessions: number;
  lastHealthCheckAt: string | null;
  lastError: string | null;
};

type InternalChannel = {
  id: string;
  organizationId: string;
  businessKey: string;
  businessLabel: string;
  channelType: string;
  provider: string | null;
  providerType: string | null;
  accountLabel: string;
  displayName: string;
  sessionId: string | null;
  gatewayId: string | null;
  gatewayName: string;
  externalAccountId: string | null;
  phoneNumber: string | null;
  purpose: string;
  status: string;
  featureStage: string;
  active: boolean;
  inboxUrl: string;
  originContext: {
    business: string;
    channel: string;
    account: string;
    sessionId: string | null;
    gateway: string | null;
    purpose: string;
  };
  lastEventAt: string | null;
  lastError: string | null;
};

type PlannedChannel = {
  businessKey: string;
  sessionId: string;
  purpose: string;
  channelType: string;
  gatewayId: string;
};

type ApiResponse = {
  ok: boolean;
  gateways?: InternalGateway[];
  organizations?: InternalOrganization[];
  channels?: InternalChannel[];
  plannedChannels?: PlannedChannel[];
  error?: string;
};

const channelTypes = [
  { value: "whatsapp_web", label: "WhatsApp Web" },
  { value: "whatsapp_official", label: "WhatsApp Oficial" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "email", label: "E-mail" },
  { value: "website_chat", label: "Chat do site" },
];

const purposes = INTERNAL_CHANNEL_PURPOSES.map((value) => ({ value, label: INTERNAL_CHANNEL_PURPOSE_LABELS[value] }));

function statusClass(status: string) {
  if (status === "connected") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "starting" || status === "qr_required" || status === "connecting") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "error" || status === "disconnected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusLabel(status: string) {
  if (status === "draft") return "Nova";
  if (status === "starting") return "Iniciando";
  if (status === "qr_required") return "Aguardando QR";
  if (status === "connecting") return "Conectando";
  if (status === "connected") return "Conectado";
  if (status === "disconnected") return "Desconectado";
  if (status === "error") return "Erro";
  if (status === "disabled") return "Desativado";
  return status;
}

function channelTypeLabel(value: string) {
  return channelTypes.find((item) => item.value === value)?.label || value;
}

function purposeLabel(value: string) {
  return purposes.find((item) => item.value === value)?.label || value;
}

export function InternalChannelsPanel() {
  const [gateways, setGateways] = useState<InternalGateway[]>([]);
  const [organizations, setOrganizations] = useState<InternalOrganization[]>([]);
  const [channels, setChannels] = useState<InternalChannel[]>([]);
  const [plannedChannels, setPlannedChannels] = useState<PlannedChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);
  const [updatingChannelId, setUpdatingChannelId] = useState<string | null>(null);
  const [qrByChannel, setQrByChannel] = useState<Record<string, string | null>>({});
  const [pairingCodeByChannel, setPairingCodeByChannel] = useState<Record<string, string | null>>({});
  const [editingGatewayId, setEditingGatewayId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState({ businessKey: "all", channelType: "all", gatewayId: "all", purpose: "all", status: "all" });
  const [form, setForm] = useState({
    organizationId: "",
    gatewayId: "",
    channelType: "whatsapp_web",
    accountLabel: "",
    purpose: "support",
    externalAccountId: "",
    status: "draft",
    featureStage: "internal_alpha",
  });
  const [gatewayForm, setGatewayForm] = useState({
    name: "Gateway 01",
    slug: "gateway-01",
    provider: "openwa",
    baseUrl: "",
    environment: "production",
    status: "inactive",
    maxSessions: 9,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/operations/internal-channels", { cache: "no-store" });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha ao carregar canais internos.");
      setGateways(data.gateways || []);
      setOrganizations(data.organizations || []);
      setChannels(data.channels || []);
      setPlannedChannels(data.plannedChannels || []);
      if (!form.organizationId && data.organizations?.[0]?.id) {
        setForm((current) => ({ ...current, organizationId: data.organizations![0].id, gatewayId: current.gatewayId || data.gateways?.[0]?.id || "" }));
      } else if (!form.gatewayId && data.gateways?.[0]?.id) {
        setForm((current) => ({ ...current, gatewayId: data.gateways![0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar canais internos.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/internal-channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha ao cadastrar canal interno.");
      setNotice("Canal interno cadastrado para validação.");
      setForm((current) => ({ ...current, accountLabel: "", externalAccountId: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar canal interno.");
    } finally {
      setSaving(false);
    }
  }

  async function submitGateway(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingGateway(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/internal-gateways", {
        method: editingGatewayId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editingGatewayId ? { id: editingGatewayId, name: gatewayForm.name, baseUrl: gatewayForm.baseUrl, environment: gatewayForm.environment, status: gatewayForm.status, maxSessions: Number(gatewayForm.maxSessions) } : gatewayForm),
      });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha ao cadastrar gateway interno.");
      setNotice(editingGatewayId ? "Gateway interno atualizado." : "Gateway interno cadastrado.");
      setEditingGatewayId(null);
      setGatewayForm({ name: "Gateway 01", slug: "gateway-01", provider: "openwa", baseUrl: "", environment: "production", status: "inactive", maxSessions: 9 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar gateway interno.");
    } finally {
      setSavingGateway(false);
    }
  }

  async function checkGateway(gateway: InternalGateway) {
    setUpdatingChannelId(gateway.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/internal-gateways", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: gateway.id, action: "health_check" }),
      });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha no health check.");
      setNotice("Health check do gateway concluído.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no health check.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  async function setGatewayStatus(gateway: InternalGateway, status: "active" | "inactive" | "maintenance") {
    setUpdatingChannelId(gateway.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/internal-gateways", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: gateway.id, status }),
      });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha ao atualizar gateway.");
      setNotice("Status do gateway atualizado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar gateway.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  function editGateway(gateway: InternalGateway) {
    setEditingGatewayId(gateway.id);
    setGatewayForm({
      name: gateway.name,
      slug: gateway.slug,
      provider: gateway.provider,
      baseUrl: "",
      environment: gateway.environment,
      status: gateway.status === "error" ? "maintenance" : gateway.status,
      maxSessions: gateway.maxSessions,
    });
    setNotice("Informe novamente a URL base para editar este gateway. O identificador não é alterado.");
  }

  async function requestQr(channel: InternalChannel) {
    setUpdatingChannelId(channel.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/operations/internal-channels/${channel.id}/qr`, { method: "POST" });
      const data = await response.json() as { ok: boolean; error?: string; qrCode?: string | null; pairingCode?: string | null; phone?: string | null; status?: string };
      if (!data.ok) throw new Error(data.error || "Falha ao solicitar QR.");
      setQrByChannel((current) => ({ ...current, [channel.id]: data.qrCode || null }));
      setPairingCodeByChannel((current) => ({ ...current, [channel.id]: data.pairingCode || null }));
      setNotice(data.qrCode || data.pairingCode ? "Conexão gerada. Use o QR ou o código no WhatsApp autorizado." : `Status da sessão: ${statusLabel(data.status || "draft")}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao solicitar QR.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  async function refreshChannelStatus(channel: InternalChannel) {
    setUpdatingChannelId(channel.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/operations/internal-channels/${channel.id}/status`, { cache: "no-store" });
      const data = await response.json() as { ok: boolean; error?: string; status?: string; providerStatus?: string; phone?: string | null };
      if (!data.ok) throw new Error(data.error || "Falha ao atualizar status.");
      if (data.status === "connected") {
        setQrByChannel((current) => ({ ...current, [channel.id]: null }));
        setPairingCodeByChannel((current) => ({ ...current, [channel.id]: null }));
      }
      setNotice(`Status atualizado: ${statusLabel(data.status || "draft")}${data.phone ? ` · ${data.phone}` : ""}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar status.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  async function refreshWhatsappChannels(targetChannels: InternalChannel[], label = "canais") {
    const whatsappChannels = targetChannels.filter((channel) => channel.channelType === "whatsapp_web" && channel.active);
    if (!whatsappChannels.length) return;
    setUpdatingChannelId(`bulk-status-${label}`);
    setError(null);
    setNotice(null);
    const errors: string[] = [];
    let updated = 0;
    try {
      for (const channel of whatsappChannels) {
        const response = await fetch(`/api/operations/internal-channels/${channel.id}/status`, { cache: "no-store" });
        const data = await response.json() as { ok: boolean; error?: string; status?: string; phone?: string | null };
        if (!data.ok) {
          errors.push(`${channel.accountLabel}: ${data.error || "falha"}`);
          continue;
        }
        if (data.status === "connected") {
          setQrByChannel((current) => ({ ...current, [channel.id]: null }));
          setPairingCodeByChannel((current) => ({ ...current, [channel.id]: null }));
        }
        updated += 1;
      }
      await load();
      setNotice(`Status atualizado em ${updated} WhatsApp(s)${errors.length ? `. Pendências: ${errors.join("; ")}` : "."}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar WhatsApps.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  async function prepareWhatsappConnections(targetChannels: InternalChannel[], label = "canais") {
    const pendingChannels = targetChannels.filter((channel) => channel.channelType === "whatsapp_web" && channel.active && channel.status !== "connected");
    if (!pendingChannels.length) return;
    setUpdatingChannelId(`bulk-qr-${label}`);
    setError(null);
    setNotice(null);
    const errors: string[] = [];
    let prepared = 0;
    try {
      for (const channel of pendingChannels) {
        const response = await fetch(`/api/operations/internal-channels/${channel.id}/qr`, { method: "POST" });
        const data = await response.json() as { ok: boolean; error?: string; qrCode?: string | null; pairingCode?: string | null };
        if (!data.ok) {
          errors.push(`${channel.accountLabel}: ${data.error || "falha"}`);
          continue;
        }
        setQrByChannel((current) => ({ ...current, [channel.id]: data.qrCode || null }));
        setPairingCodeByChannel((current) => ({ ...current, [channel.id]: data.pairingCode || null }));
        prepared += 1;
      }
      await load();
      setNotice(`${prepared} WhatsApp(s) preparado(s) para conexão. Escaneie cada QR/código na conta correta${errors.length ? `. Pendências: ${errors.join("; ")}` : "."}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao preparar conexões WhatsApp.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  async function toggleChannel(channel: InternalChannel) {
    setUpdatingChannelId(channel.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/operations/internal-channels", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, active: !channel.active }),
      });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha ao atualizar canal interno.");
      setNotice(channel.active ? "Canal interno desativado." : "Canal interno reativado para preparação.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar canal interno.");
    } finally {
      setUpdatingChannelId(null);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredChannels = channels.filter((channel) => {
    if (filters.businessKey !== "all" && channel.businessKey !== filters.businessKey) return false;
    if (filters.channelType !== "all" && String(channel.channelType) !== filters.channelType) return false;
    if (filters.gatewayId !== "all" && channel.gatewayId !== filters.gatewayId) return false;
    if (filters.purpose !== "all" && channel.purpose !== filters.purpose) return false;
    if (filters.status !== "all" && channel.status !== filters.status) return false;
    return true;
  });
  const whatsappChannels = channels.filter((channel) => channel.channelType === "whatsapp_web");
  const activeWhatsappChannels = whatsappChannels.filter((channel) => channel.active);
  const pendingWhatsappChannels = activeWhatsappChannels.filter((channel) => channel.status !== "connected");
  const whatsappByOrganization = organizations.map((organization) => {
    const organizationChannels = whatsappChannels.filter((channel) => channel.businessKey === organization.businessKey);
    const activeChannels = organizationChannels.filter((channel) => channel.active);
    return {
      organization,
      channels: organizationChannels,
      activeChannels,
      connected: activeChannels.filter((channel) => channel.status === "connected").length,
      pending: activeChannels.filter((channel) => channel.status !== "connected").length,
    };
  }).filter((item) => item.channels.length > 0);
  const selectedOrganization = organizations.find((organization) => organization.id === form.organizationId);
  const selectedNextSession = selectedOrganization?.nextSessions.find((session) => session.gatewayId === form.gatewayId);
  const whatsappWebSelected = form.channelType === "whatsapp_web";
  const plannedByBusiness = plannedChannels.filter((item) => item.businessKey === selectedOrganization?.businessKey);

  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] bg-[#1B2F5B] p-8 text-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2ABFAB]">Centro de Comando</p>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">Uso interno</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">Validação interna</span>
        </div>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">Canais internos Allan/Moriah</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">
          Cadastre canais, gateways e origens internas sem misturar clientes SaaS. Segredos ficam fora desta tela; conexão, QR e status são operados daqui sem abrir o gateway.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#2ABFAB] px-5 font-black text-white hover:bg-[#229d8e]">
            <Link href="/operations">Voltar ao Centro</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 font-black text-white hover:bg-white/10">
            <Link href="/whatsapp-messages">Abrir inbox geral</Link>
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Cadastro controlado</h2>
          <p className="text-sm text-slate-500">Somente empresas internas reconhecidas aparecem aqui.</p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div>}

      <Card className="rounded-[2rem] border-[#2ABFAB]/20 bg-[#2ABFAB]/5">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-[#1B2F5B]">WhatsApps por conta</CardTitle>
              <p className="mt-1 text-sm text-slate-600">Conecte e confira todos os WhatsApps internos por empresa, sem abrir o gateway.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" disabled={!activeWhatsappChannels.length || updatingChannelId !== null} onClick={() => refreshWhatsappChannels(activeWhatsappChannels, "todos")}>Atualizar todos</Button>
              <Button type="button" size="sm" className="rounded-full bg-[#2ABFAB] font-black text-white hover:bg-[#229d8e]" disabled={!pendingWhatsappChannels.length || updatingChannelId !== null} onClick={() => prepareWhatsappConnections(pendingWhatsappChannels, "todos")}>Gerar QR/código pendentes</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {whatsappByOrganization.map(({ organization, channels: organizationChannels, activeChannels, connected, pending }) => (
              <div key={organization.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#1B2F5B]">{organization.businessLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{connected}/{activeChannels.length} conectados · {pending} pendente(s)</p>
                  </div>
                  <Badge className={pending ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{pending ? "Pendente" : "OK"}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {organizationChannels.map((channel) => (
                    <div key={channel.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-bold text-slate-800">{channel.accountLabel}</span> · {channel.sessionId} · {statusLabel(channel.status)} · {channel.phoneNumber || "sem telefone"}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={!activeChannels.length || updatingChannelId !== null} onClick={() => refreshWhatsappChannels(activeChannels, organization.businessKey)}>Atualizar conta</Button>
                  <Button type="button" size="sm" className="rounded-full bg-[#1B2F5B] font-black text-white hover:bg-[#16284d]" disabled={!pending || updatingChannelId !== null} onClick={() => prepareWhatsappConnections(activeChannels, organization.businessKey)}>Conectar pendentes</Button>
                </div>
              </div>
            ))}
            {!whatsappByOrganization.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 md:col-span-2 xl:col-span-3">Nenhum WhatsApp interno cadastrado ainda.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card className="rounded-[2rem] xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1B2F5B]">Gateways internos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
              <form onSubmit={submitGateway} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">Nome<input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={gatewayForm.name} onChange={(event) => setGatewayForm({ ...gatewayForm, name: event.target.value })} /></label>
                  <label className="block text-sm font-bold text-slate-700">Slug<input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100" value={gatewayForm.slug} disabled={Boolean(editingGatewayId)} onChange={(event) => setGatewayForm({ ...gatewayForm, slug: event.target.value })} /></label>
                </div>
                <label className="block text-sm font-bold text-slate-700">Base URL<input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={gatewayForm.baseUrl} onChange={(event) => setGatewayForm({ ...gatewayForm, baseUrl: event.target.value })} placeholder="https://gateway.exemplo.com" /></label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">Ambiente<select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={gatewayForm.environment} onChange={(event) => setGatewayForm({ ...gatewayForm, environment: event.target.value })}><option value="production">Produção</option><option value="test">Teste</option></select></label>
                  <label className="block text-sm font-bold text-slate-700">Status<select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={gatewayForm.status} onChange={(event) => setGatewayForm({ ...gatewayForm, status: event.target.value })}><option value="inactive">Inativo</option><option value="active">Ativo</option><option value="maintenance">Manutenção</option></select></label>
                </div>
                <label className="block text-sm font-bold text-slate-700">Limite de sessões<input type="number" min={1} max={9} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={gatewayForm.maxSessions} onChange={(event) => setGatewayForm({ ...gatewayForm, maxSessions: Number(event.target.value) })} /></label>
                <div className="flex gap-2">
                  <Button type="submit" disabled={savingGateway} className="flex-1 rounded-full bg-[#1B2F5B] font-black text-white hover:bg-[#16284d]">{savingGateway ? "Salvando..." : editingGatewayId ? "Salvar edição" : "Cadastrar gateway"}</Button>
                  {editingGatewayId && <Button type="button" variant="outline" className="rounded-full" onClick={() => { setEditingGatewayId(null); setGatewayForm({ name: "Gateway 01", slug: "gateway-01", provider: "openwa", baseUrl: "", environment: "production", status: "inactive", maxSessions: 9 }); }}>Cancelar</Button>}
                </div>
                <p className="text-xs text-slate-500">Não cadastre API key, secret, token ou cookie. Credenciais ficam no ambiente do gateway.</p>
              </form>
              <div className="space-y-3">
                {gateways.map((gateway) => (
                  <div key={gateway.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-black text-[#1B2F5B]">{gateway.name}</p><p className="mt-1 text-xs text-slate-500">{gateway.provider} · {gateway.environment} · {gateway.activeSessions} canais cadastrados · limite {gateway.maxSessions} por empresa</p><p className="mt-1 text-xs text-slate-400">{gateway.baseUrlMasked}</p><p className="mt-1 text-xs text-slate-400">Última verificação: {gateway.lastHealthCheckAt || "nunca"}</p>{gateway.lastError && <p className="mt-1 text-xs font-bold text-red-600">{gateway.lastError}</p>}</div>
                      <div className="flex flex-wrap justify-end gap-2"><Badge className={statusClass(gateway.status)}>{gateway.status}</Badge><Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => editGateway(gateway)}>Editar</Button><Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === gateway.id} onClick={() => setGatewayStatus(gateway, "active")}>Ativar</Button><Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === gateway.id} onClick={() => setGatewayStatus(gateway, "maintenance")}>Manutenção</Button><Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === gateway.id} onClick={() => setGatewayStatus(gateway, "inactive")}>Desativar</Button><Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === gateway.id} onClick={() => checkGateway(gateway)}>Verificar saúde</Button><Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setFilters({ ...filters, channelType: "whatsapp_web", gatewayId: gateway.id })}>Ver canais</Button></div>
                    </div>
                  </div>
                ))}
                {!gateways.length && <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Nenhum gateway interno cadastrado. Cadastre um gateway antes de criar sessões WhatsApp internas.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1B2F5B]">Novo canal interno</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                Empresa interna
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })}>
                  {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.businessLabel}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Tipo
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.channelType} onChange={(event) => setForm({ ...form, channelType: event.target.value })}>
                  {channelTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              {whatsappWebSelected && (
                <label className="block text-sm font-bold text-slate-700">
                  Gateway
                  <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.gatewayId} onChange={(event) => setForm({ ...form, gatewayId: event.target.value })}>
                    {gateways.map((gateway) => <option key={gateway.id} value={gateway.id}>{gateway.name} · {gateway.environment}</option>)}
                  </select>
                </label>
              )}
              <label className="block text-sm font-bold text-slate-700">
                Nome de exibição
                <input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.accountLabel} onChange={(event) => setForm({ ...form, accountLabel: event.target.value })} placeholder="Ex.: Shamar Kids Pais" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Finalidade
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })}>
                  {purposes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              {whatsappWebSelected && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <p className="font-black text-slate-700">Próxima sessão gerada</p>
                  {selectedNextSession?.ok ? (
                    <p className="mt-1 text-lg font-black text-[#1B2F5B]">{selectedNextSession.sessionId}</p>
                  ) : (
                    <p className="mt-1 font-bold text-red-700">{selectedNextSession?.error || "Selecione empresa e gateway."}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">Operadores não digitam session ID livremente. O padrão é sempre empresa-01 até empresa-09 por gateway, contado por empresa.</p>
                </div>
              )}
              <label className="block text-sm font-bold text-slate-700">
                Identificador externo não secreto
                <input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={form.externalAccountId} onChange={(event) => setForm({ ...form, externalAccountId: event.target.value })} placeholder="Page ID, phone_number_id ou conta" />
              </label>
              <Button type="submit" disabled={saving || !organizations.length || (whatsappWebSelected && !gateways.length)} className="w-full rounded-full bg-[#2ABFAB] font-black text-white hover:bg-[#229d8e]">
                {saving ? "Salvando..." : "Cadastrar canal interno"}
              </Button>
              {plannedByBusiness.length > 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                  <p className="font-black uppercase tracking-wide text-slate-600">Preparação prevista</p>
                  <div className="mt-2 space-y-1">
                    {plannedByBusiness.map((item) => (
                      <p key={`${item.gatewayId}-${item.sessionId}`}>{item.sessionId} · {purposeLabel(item.purpose)} · {item.gatewayId}</p>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1B2F5B]">Canais cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 md:grid-cols-5">
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                Empresa
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700" value={filters.businessKey} onChange={(event) => setFilters({ ...filters, businessKey: event.target.value })}>
                  <option value="all">Todas</option>
                  {organizations.map((organization) => <option key={organization.businessKey} value={organization.businessKey}>{organization.businessLabel}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                Canal
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700" value={filters.channelType} onChange={(event) => setFilters({ ...filters, channelType: event.target.value })}>
                  <option value="all">Todos</option>
                  {channelTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                Gateway
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700" value={filters.gatewayId} onChange={(event) => setFilters({ ...filters, gatewayId: event.target.value })}>
                  <option value="all">Todos</option>
                  {gateways.map((gateway) => <option key={gateway.id} value={gateway.id}>{gateway.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                Finalidade
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700" value={filters.purpose} onChange={(event) => setFilters({ ...filters, purpose: event.target.value })}>
                  <option value="all">Todas</option>
                  {purposes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                Status
                <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                  <option value="all">Todos</option>
                  <option value="draft">Rascunho</option>
                  <option value="starting">Iniciando</option>
                  <option value="qr_required">Aguardando QR</option>
                  <option value="connecting">Conectando</option>
                  <option value="connected">Conectado</option>
                  <option value="disconnected">Desconectado</option>
                  <option value="error">Atenção</option>
                  <option value="disabled">Desativado</option>
                </select>
              </label>
            </div>
            <div className="space-y-3">
              {filteredChannels.map((channel) => (
                <div key={channel.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#1B2F5B]">{channel.accountLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{channel.businessLabel} · {channelTypeLabel(String(channel.channelType))} · {purposeLabel(channel.purpose)}</p>
                      <p className="mt-1 text-xs text-slate-400">Sessão/conta: {channel.sessionId || channel.externalAccountId || "a configurar"} · Gateway: {channel.gatewayName}</p>
                      <p className="mt-1 text-xs text-slate-400">Telefone conectado: {channel.phoneNumber || "a conectar"}</p>
                      <p className="mt-1 text-xs text-slate-400">Última atividade: {channel.lastEventAt || "sem evento registrado"}</p>
                      {channel.lastError && <p className="mt-1 text-xs font-bold text-red-600">Último erro: {channel.lastError}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusClass(channel.status)}>{statusLabel(channel.status)}</Badge>
                      <Badge variant="outline">{channel.featureStage}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link href={channel.inboxUrl}>
                        Inbox filtrada
                      </Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === channel.id} onClick={() => toggleChannel(channel)}>
                      {channel.active ? "Desativar" : "Ativar"}
                    </Button>
                    {channel.channelType === "whatsapp_web" && (
                      <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === channel.id} onClick={() => refreshChannelStatus(channel)}>Atualizar status</Button>
                    )}
                    {channel.channelType === "whatsapp_web" && channel.status !== "connected" && channel.active && (
                      <Button type="button" size="sm" className="rounded-full bg-[#2ABFAB] font-black text-white hover:bg-[#229d8e]" disabled={updatingChannelId === channel.id} onClick={() => requestQr(channel)}>{qrByChannel[channel.id] ? "Atualizar QR" : "Conectar / Ver QR"}</Button>
                    )}
                  </div>
                  {(qrByChannel[channel.id] || pairingCodeByChannel[channel.id]) && (
                    <div className="mt-4 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-[auto_1fr]">
                      {qrByChannel[channel.id] ? (
                        <img src={qrByChannel[channel.id] || ""} alt={`QR Code ${channel.accountLabel}`} className="h-56 w-56 rounded-2xl border border-white bg-white p-2 shadow-sm" />
                      ) : (
                        <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-white p-4 text-center text-xs font-bold text-amber-900">QR não retornado pelo gateway</div>
                      )}
                      <div className="text-sm text-amber-900">
                        <p className="font-black">Escaneie no WhatsApp autorizado</p>
                        <p className="mt-2">Abra o WhatsApp no celular, toque em Dispositivos conectados e escaneie este QR. Se preferir, use o código de telefone quando disponível. Depois clique em Atualizar status.</p>
                        {pairingCodeByChannel[channel.id] && <p className="mt-3 rounded-2xl bg-white px-4 py-3 font-mono text-2xl font-black tracking-[0.3em] text-[#1B2F5B]">{pairingCodeByChannel[channel.id]}</p>}
                        <p className="mt-2 text-xs font-bold">Sessão: {channel.sessionId} · Gateway: {channel.gatewayName}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!channels.length && <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Nenhum canal interno cadastrado. Cadastre o primeiro canal para começar a centralizar as comunicações das empresas da Moriah.</p>}
              {channels.length > 0 && !filteredChannels.length && <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Nenhum canal corresponde aos filtros selecionados.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-[2rem]">
          <CardHeader><CardTitle className="text-base font-black text-[#1B2F5B]">Grupos</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-500">Modelo preparado com identificador, canal, sessão, participantes, administradores, último evento e leitura. Envio real desabilitado.</CardContent>
        </Card>
        <Card className="rounded-[2rem]">
          <CardHeader><CardTitle className="text-base font-black text-[#1B2F5B]">Comunidades</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-500">Modelo preparado para comunidade, grupo de anúncios, grupos vinculados, administradores, metadata e limitações do provider.</CardContent>
        </Card>
        <Card className="rounded-[2rem]">
          <CardHeader><CardTitle className="text-base font-black text-[#1B2F5B]">Redes sociais</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-500">Instagram, Facebook e TikTok exibem Não conectado, Conectado, Token expirado ou Erro de conexão sem retornar tokens ao frontend.</CardContent>
        </Card>
      </div>
    </div>
  );
}
