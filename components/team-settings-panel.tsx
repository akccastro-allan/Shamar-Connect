"use client";

import { useEffect, useState } from "react";
import { UserPlus, RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Department = { id: string; name: string; color: string };
type Member = {
  id: string;
  role: string;
  status: string;
  department_id: string | null;
  app_users: { name: string | null; email: string } | null;
  departments: { id: string; name: string; color: string } | null;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  attendant: "Atendente",
  viewer: "Somente leitura",
};
const ROLE_OPTIONS = ["admin", "attendant", "viewer"];

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ABFAB]/30";

export function TeamSettingsPanel({ canManage }: { canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", role: "attendant", department_id: "" });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [mRes, dRes] = await Promise.all([
        fetch("/api/team", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
      ]);
      const [mData, dData] = await Promise.all([mRes.json(), dRes.json()]);
      if (!mRes.ok || !mData.ok) throw new Error(mData?.error || "Erro ao carregar equipe");
      setMembers(mData.members as Member[]);
      if (dData.ok) setDepartments(dData.departments as Department[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data?.error || "Falha");
    return data;
  }

  async function invite() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await post({ action: "invite", ...form, department_id: form.department_id || null });
      if (data.member?.tempPassword) {
        setNotice(`Atendente criado. Senha temporária: ${data.member.tempPassword} — compartilhe com ${form.email} (ele troca depois).`);
      } else {
        setNotice("Atendente adicionado à equipe.");
      }
      setForm({ name: "", email: "", role: "attendant", department_id: "" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function update(tenantUserId: string, patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await post({ action: "update", tenantUserId, ...patch });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Equipe de atendimento</CardTitle>
              <CardDescription>Atendentes da clínica, com papel e setor. O atendente vê as conversas conforme a permissão.</CardDescription>
            </div>
            <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
              <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}

          {loading && members.length === 0 ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const inactive = m.status !== "active";
                return (
                  <div key={m.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{m.app_users?.name || m.app_users?.email || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.app_users?.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {m.departments ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${m.departments.color}1A`, color: m.departments.color }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.departments.color }} />
                          {m.departments.name}
                        </span>
                      ) : null}
                      {inactive ? <Badge variant="secondary">Inativo</Badge> : null}

                      {canManage && m.role !== "owner" ? (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) => update(m.id, { role: e.target.value })}
                            disabled={saving}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                          >
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                          <select
                            value={m.department_id || ""}
                            onChange={(e) => update(m.id, { department_id: e.target.value || null })}
                            disabled={saving}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="">Sem setor</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <Button onClick={() => update(m.id, { status: inactive ? "active" : "inactive" })} disabled={saving} variant="outline" size="sm">
                            {inactive ? "Ativar" : "Desativar"}
                          </Button>
                        </>
                      ) : (
                        <Badge className="bg-[#1B2F5B] text-white">{ROLE_LABEL[m.role] || m.role}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {members.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum membro ainda.</p> : null}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-5 w-5" />Convidar atendente</CardTitle>
            <CardDescription>Cria o acesso na hora. Uma senha temporária é gerada para você repassar — o atendente troca depois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Nome</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Letícia" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">E-mail</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="leticia@clinica.com" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Papel</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inputClass}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Setor</label>
                <select value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))} className={inputClass}>
                  <option value="">Sem setor</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={invite} disabled={saving || !form.name.trim() || !form.email.trim()} className="bg-emerald-700 hover:bg-emerald-800">
              {saving ? "Criando..." : "Convidar atendente"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
