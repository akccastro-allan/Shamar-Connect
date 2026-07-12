"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  baseUrl: string;
  environment: string;
  status: string;
  version: string | null;
  maxSessions: number;
  activeSessions: number;
  lastHealthCheck: string | null;
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

const purposes = [
  { value: "support", label: "Atendimento" },
  { value: "sales", label: "Vendas" },
  { value: "parents", label: "Pais" },
  { value: "operations", label: "Operações" },
  { value: "personal", label: "Pessoal" },
  { value: "marketing", label: "Marketing" },
  { value: "community", label: "Comunidade" },
  { value: "other", label: "Outro" },
];

function statusClass(status: string) {
  if (status === "connected") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "connecting") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "error" || status === "disconnected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState({ businessKey: "all", channelType: "all", purpose: "all", status: "all" });
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
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(gatewayForm),
      });
      const data = await response.json() as ApiResponse;
      if (!data.ok) throw new Error(data.error || "Falha ao cadastrar gateway interno.");
      setNotice("Gateway interno cadastrado.");
      setGatewayForm((current) => ({ ...current, baseUrl: "" }));
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

  async function requestQr(channel: InternalChannel) {
    setUpdatingChannelId(channel.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/operations/internal-channels/${channel.id}/qr`, { method: "POST" });
      const data = await response.json() as { ok: boolean; error?: string; qrCode?: string | null; status?: string };
      if (!data.ok) throw new Error(data.error || "Falha ao solicitar QR.");
      setQrByChannel((current) => ({ ...current, [channel.id]: data.qrCode || null }));
      setNotice(`Status da sessão: ${data.status || "em preparação"}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao solicitar QR.");
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
    if (filters.purpose !== "all" && channel.purpose !== filters.purpose) return false;
    if (filters.status !== "all" && channel.status !== filters.status) return false;
    return true;
  });
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
          Cadastre canais, gateways e origens internas sem misturar clientes SaaS. Segredos ficam fora desta tela e nenhuma conexão real é iniciada aqui.
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
                  <label className="block text-sm font-bold text-slate-700">Slug<input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={gatewayForm.slug} onChange={(event) => setGatewayForm({ ...gatewayForm, slug: event.target.value })} /></label>
                </div>
                <label className="block text-sm font-bold text-slate-700">Base URL<input className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={gatewayForm.baseUrl} onChange={(event) => setGatewayForm({ ...gatewayForm, baseUrl: event.target.value })} placeholder="https://gateway.exemplo.com" /></label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">Ambiente<select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={gatewayForm.environment} onChange={(event) => setGatewayForm({ ...gatewayForm, environment: event.target.value })}><option value="production">Produção</option><option value="test">Teste</option></select></label>
                  <label className="block text-sm font-bold text-slate-700">Status<select className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={gatewayForm.status} onChange={(event) => setGatewayForm({ ...gatewayForm, status: event.target.value })}><option value="inactive">Inativo</option><option value="active">Ativo</option><option value="maintenance">Manutenção</option><option value="error">Erro</option></select></label>
                </div>
                <Button type="submit" disabled={savingGateway} className="w-full rounded-full bg-[#1B2F5B] font-black text-white hover:bg-[#16284d]">{savingGateway ? "Salvando..." : "Cadastrar gateway"}</Button>
                <p className="text-xs text-slate-500">Não cadastre API key, secret, token ou cookie. Credenciais ficam no ambiente do gateway.</p>
              </form>
              <div className="space-y-3">
                {gateways.map((gateway) => (
                  <div key={gateway.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-black text-[#1B2F5B]">{gateway.name}</p><p className="mt-1 text-xs text-slate-500">{gateway.provider} · {gateway.environment} · {gateway.activeSessions}/{gateway.maxSessions} sessões</p><p className="mt-1 text-xs text-slate-400">{gateway.baseUrl}</p>{gateway.lastError && <p className="mt-1 text-xs font-bold text-red-600">{gateway.lastError}</p>}</div>
                      <div className="flex flex-wrap gap-2"><Badge className={statusClass(gateway.status)}>{gateway.status}</Badge><Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === gateway.id} onClick={() => checkGateway(gateway)}>Health check</Button></div>
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
                  <p className="mt-2 text-xs text-slate-500">Operadores não digitam session ID livremente. O padrão é sempre empresa-01 até empresa-09 por gateway.</p>
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
            <div className="mb-4 grid gap-3 md:grid-cols-4">
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
                      <p className="mt-1 text-xs text-slate-400">Última atividade: {channel.lastEventAt || "sem evento registrado"}</p>
                      {channel.lastError && <p className="mt-1 text-xs font-bold text-red-600">Último erro: {channel.lastError}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusClass(channel.status)}>{channel.status}</Badge>
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
                    {channel.channelType === "whatsapp_web" && channel.status !== "connected" && (
                      <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatingChannelId === channel.id} onClick={() => requestQr(channel)}>Conectar WhatsApp</Button>
                    )}
                  </div>
                  {qrByChannel[channel.id] && <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">QR recebido para conexão manual. Escaneie apenas com o número autorizado por Allan.</div>}
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
