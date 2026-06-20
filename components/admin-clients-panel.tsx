"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShieldCheck, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";

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

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "business", label: "Business" },
];

type Subscription = {
  id: string;
  plan_slug: string;
  billing_cycle: string;
  status: string;
  total_amount: number;
  current_period_end: string | null;
  billing_provider: string;
};

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
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Provision form
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [provisioned, setProvisioned] = useState<ProvisionResult | null>(null);

  // Activate subscription modal
  const [activating, setActivating] = useState<Client | null>(null);
  const [activatePlan, setActivatePlan] = useState("professional");
  const [activateCycle, setActivateCycle] = useState("monthly");
  const [activateAmount, setActivateAmount] = useState("");
  const [activateNotes, setActivateNotes] = useState("");
  const [activateError, setActivateError] = useState("");
  const [activateSubmitting, setActivateSubmitting] = useState(false);

  async function loadClients() {
    setLoading(true);
    try {
      const [clientsRes, subsRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/subscriptions"),
      ]);
      const clientsData = await clientsRes.json();
      const subsData = await subsRes.json();

      if (clientsData.ok) setClients(clientsData.clients || []);
      if (subsData.ok) {
        const subMap: Record<string, Subscription> = {};
        for (const s of (subsData.subscriptions || [])) {
          subMap[s.tenant_id] = s;
        }
        setSubscriptions(subMap);
      }
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

  async function handleProvision(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/provision-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName, ownerEmail, companyName, tempPassword: tempPassword || undefined, sessions: selectedSessions }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao provisionar");
      setProvisioned(data.client);
      await loadClients();
      setOwnerName(""); setOwnerEmail(""); setCompanyName(""); setTempPassword(""); setSelectedSessions([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivateSubscription(e: FormEvent) {
    e.preventDefault();
    if (!activating) return;
    setActivateError("");
    setActivateSubmitting(true);
    try {
      const orgId = activating.organizations?.[0]?.id;
      if (!orgId) throw new Error("Organização não encontrada para este cliente.");
      const res = await fetch("/api/admin/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: activating.id,
          organizationId: orgId,
          planSlug: activatePlan,
          billingCycle: activateCycle,
          totalAmount: Number(activateAmount) || 0,
          notes: activateNotes,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao ativar assinatura");
      setActivating(null);
      await loadClients();
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setActivateSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? "Carregando…" : `${clients.length} cliente${clients.length !== 1 ? "s" : ""}`}
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

      {/* Success after provisioning */}
      {provisioned && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Cliente provisionado com sucesso
            </CardTitle>
            <CardDescription className="text-emerald-600">
              Guarde as credenciais — a senha temporária não será exibida novamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-sm">
            <div className="rounded-xl bg-white p-4 space-y-2 shadow-sm">
              <p><span className="font-bold text-slate-500">E-mail:</span> {provisioned.email}</p>
              <p><span className="font-bold text-slate-500">Senha:</span> <span className="font-black text-[#1B2F5B]">{provisioned.tempPassword}</span></p>
              <p><span className="font-bold text-slate-500">Sessões:</span> {provisioned.sessions.join(", ") || "nenhuma"}</p>
              <p><span className="font-bold text-slate-500">Tenant:</span> <span className="text-xs text-slate-400">{provisioned.tenantId}</span></p>
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
            <CardDescription>Cria tenant, organização, usuário e canais de uma só vez.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProvision} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Nome da empresa *", value: companyName, set: setCompanyName, placeholder: "Ex: Auto Peças Silva", type: "text" },
                  { label: "Nome do responsável *", value: ownerName, set: setOwnerName, placeholder: "Ex: João Silva", type: "text" },
                  { label: "E-mail de acesso *", value: ownerEmail, set: setOwnerEmail, placeholder: "joao@empresa.com.br", type: "email" },
                  { label: "Senha temporária", value: tempPassword, set: setTempPassword, placeholder: "Deixe vazio para gerar automaticamente", type: "text" },
                ].map(({ label, value, set, placeholder, type }) => (
                  <label key={label} className="block">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <input
                      type={type}
                      required={label.endsWith("*")}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                    />
                  </label>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Sessões WhatsApp</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ALL_SESSIONS.map(({ id, label }) => {
                    const active = selectedSessions.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSession(id)}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                          active ? "border-[#2ABFAB] bg-[#2ABFAB]/10 text-[#2ABFAB]" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {active ? "✓ " : "○ "}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>{submitting ? "Provisionando…" : "Criar cliente"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Activate subscription modal */}
      {activating && (
        <Card className="border-[#C9952A]/30 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <ShieldCheck className="h-4 w-4" />
              Ativar assinatura — {activating.name}
            </CardTitle>
            <CardDescription className="text-amber-700">
              Cria uma assinatura ativa manualmente (sem passar pelo checkout).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivateSubscription} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Plano</span>
                  <select
                    value={activatePlan}
                    onChange={(e) => setActivatePlan(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB]"
                  >
                    {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Ciclo</span>
                  <select
                    value={activateCycle}
                    onChange={(e) => setActivateCycle(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB]"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Valor (R$)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activateAmount}
                    onChange={(e) => setActivateAmount(e.target.value)}
                    placeholder="Ex: 297.00"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB]"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Observações internas</span>
                <input
                  type="text"
                  value={activateNotes}
                  onChange={(e) => setActivateNotes(e.target.value)}
                  placeholder="Ex: Contrato assinado em 20/06/2026"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB]"
                />
              </label>
              {activateError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{activateError}</div>}
              <div className="flex gap-3">
                <Button type="submit" disabled={activateSubmitting}>{activateSubmitting ? "Ativando…" : "Ativar assinatura"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setActivating(null); setActivateError(""); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Clients list */}
      <div className="space-y-3">
        {loading && <div className="py-12 text-center text-sm text-slate-400">Carregando…</div>}
        {!loading && clients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            Nenhum cliente cadastrado ainda.
          </div>
        )}
        {clients.map((client) => {
          const owner = client.tenant_users?.[0]?.app_users;
          const org = client.organizations?.[0];
          const sub = subscriptions[client.id];
          const isPaid = sub?.status === "active";

          return (
            <div key={client.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
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
                    {isPaid ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#C9952A]/15 px-2 py-0.5 text-xs font-bold text-[#C9952A]">
                        <ShieldCheck className="h-3 w-3" />
                        {sub.plan_slug} · {sub.billing_cycle === "annual" ? "anual" : "mensal"}
                        {sub.billing_provider === "manual" ? " · manual" : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-400">
                        sem assinatura
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {owner?.name || client.owner_name || "—"} · {owner?.email || client.owner_email || "—"}
                  </p>
                  {org && <p className="text-xs text-slate-400">Org: {org.name} · {new Date(client.created_at).toLocaleDateString("pt-BR")}</p>}
                  {isPaid && sub.current_period_end && (
                    <p className="text-xs text-[#C9952A]">
                      Válido até {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {client.status === "active" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-300" />
                  )}
                  {!isPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#C9952A]/40 text-xs text-[#C9952A] hover:bg-[#C9952A]/10"
                      onClick={() => { setActivating(client); setActivateError(""); }}
                    >
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Ativar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
