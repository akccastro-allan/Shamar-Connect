"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, ShieldCheck, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";

const ALL_SESSIONS = [
  { id: "hall-main", label: "Hall Donous" },
  { id: "lips-main", label: "Lips" },
  { id: "viciados-main", label: "Viciados em Trilhas" },
  { id: "mkshalom-main", label: "MK Shalom" },
  { id: "oriahfin-main", label: "Oriahfin" },
  { id: "shamar-main", label: "Shamar Connect" },
  { id: "shamarerp-main", label: "Shamar ERP" },
  { id: "shamarkids-main", label: "Shamar Kids" },
] as const;

type Client = {
  id: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  status: string;
  created_at: string;
  organizations: { id: string; name: string; status: string }[];
  tenant_users: {
    id: string;
    role: string;
    status: string;
    app_users: { id: string; name: string; email: string; status: string } | null;
  }[];
};

type ProvisionResult = {
  tenantId: string;
  organizationId: string;
  authUserId: string;
  email: string;
  tempPassword: string;
  sessions: string[];
};

export function AdminClientsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [provisioned, setProvisioned] = useState<ProvisionResult | null>(null);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (data.ok) setClients(data.clients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

  function toggleSession(id: string) {
    setSelectedSessions((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/provision-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName,
          ownerEmail,
          companyName,
          tempPassword: tempPassword || undefined,
          sessions: selectedSessions,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao provisionar");
      setProvisioned(data.client);
      await loadClients();
      setOwnerName("");
      setOwnerEmail("");
      setCompanyName("");
      setTempPassword("");
      setSelectedSessions([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? "Carregando…" : `${clients.length} cliente${clients.length !== 1 ? "s" : ""} cadastrado${clients.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadClients} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => { setShowForm(true); setProvisioned(null); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      {/* Success card after provisioning */}
      {provisioned && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Cliente provisionado com sucesso
            </CardTitle>
            <CardDescription className="text-emerald-600">
              Guarde as credenciais abaixo — a senha temporária não será exibida novamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-sm">
            <div className="rounded-xl bg-white p-4 space-y-2 shadow-sm">
              <p><span className="font-bold text-slate-500">E-mail:</span> {provisioned.email}</p>
              <p><span className="font-bold text-slate-500">Senha:</span> <span className="text-[#1B2F5B] font-black">{provisioned.tempPassword}</span></p>
              <p><span className="font-bold text-slate-500">Sessões:</span> {provisioned.sessions.join(", ") || "nenhuma"}</p>
              <p><span className="font-bold text-slate-500">Tenant ID:</span> <span className="text-xs text-slate-400">{provisioned.tenantId}</span></p>
              <p><span className="font-bold text-slate-500">Org ID:</span> <span className="text-xs text-slate-400">{provisioned.organizationId}</span></p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setProvisioned(null)}>Fechar</Button>
          </CardContent>
        </Card>
      )}

      {/* Provision form */}
      {showForm && !provisioned && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Provisionar novo cliente
            </CardTitle>
            <CardDescription>
              Cria tenant, organização, usuário e canais WhatsApp de uma só vez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Nome da empresa *</span>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Auto Peças Silva"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Nome do responsável *</span>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">E-mail de acesso *</span>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="joao@empresa.com.br"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Senha temporária</span>
                  <input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Deixe em branco para gerar automaticamente"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                  />
                </label>
              </div>

              {/* Session selector */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Sessões WhatsApp</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ALL_SESSIONS.map((session) => {
                    const active = selectedSessions.includes(session.id);
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => toggleSession(session.id)}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                          active
                            ? "border-[#2ABFAB] bg-[#2ABFAB]/10 text-[#2ABFAB]"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <span className="mr-1">{active ? "✓" : "○"}</span>
                        {session.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-slate-400">Selecione as sessões que este cliente poderá usar.</p>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Provisionando…" : "Criar cliente"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setFormError(""); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Clients list */}
      <div className="space-y-3">
        {loading && (
          <div className="py-12 text-center text-sm text-slate-400">Carregando clientes…</div>
        )}
        {!loading && clients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            Nenhum cliente cadastrado ainda.
          </div>
        )}
        {clients.map((client) => {
          const owner = client.tenant_users?.[0]?.app_users;
          const org = client.organizations?.[0];
          return (
            <div
              key={client.id}
              className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B2F5B]/10 text-sm font-black text-[#1B2F5B]">
                {(client.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{client.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    client.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {client.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {owner?.name || client.owner_name || "—"} · {owner?.email || client.owner_email || "—"}
                </p>
                {org && (
                  <p className="text-xs text-slate-400">Org: {org.name}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400">
                  {new Date(client.created_at).toLocaleDateString("pt-BR")}
                </p>
                {client.status === "active" ? (
                  <CheckCircle2 className="ml-auto mt-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="ml-auto mt-1 h-4 w-4 text-slate-300" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
