"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Department = {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
};

const PRESET_COLORS = ["#2ABFAB", "#1B2F5B", "#C9952A", "#E1306C", "#1877F2", "#22A45D", "#9333EA", "#EA580C"];

export function DepartmentsSettingsPanel({ canManage }: { canManage: boolean }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/departments", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Erro ao carregar setores");
      setDepartments(data.departments as Department[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Falha ao salvar");
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const ok = await save({ name, color });
    if (ok) {
      setName("");
      setColor(PRESET_COLORS[0]);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Setores de atendimento</CardTitle>
              <CardDescription>Organize a equipe por área (Agendamento, Financeiro, Triagem...). Cada conversa pode ir para um setor.</CardDescription>
            </div>
            <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
              <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

          {loading && departments.length === 0 ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : departments.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm font-bold text-slate-700">Nenhum setor criado ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie setores como Agendamento, Financeiro e Triagem para distribuir as conversas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {departments.map((dept) => (
                <div key={dept.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="font-bold text-slate-900">{dept.name}</span>
                    {!dept.is_active ? <Badge variant="secondary">Inativo</Badge> : null}
                  </div>
                  {canManage ? (
                    <Button
                      onClick={() => save({ id: dept.id, name: dept.name, color: dept.color, is_active: !dept.is_active })}
                      disabled={saving}
                      variant="outline"
                      size="sm"
                    >
                      {dept.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-5 w-5" />Novo setor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Nome do setor</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Agendamento"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ABFAB]/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Cor ${c}`}
                    className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-[#1B2F5B]" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="bg-emerald-700 hover:bg-emerald-800">
              {saving ? "Salvando..." : "Criar setor"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
