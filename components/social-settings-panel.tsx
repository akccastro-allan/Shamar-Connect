"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SocialAccount = {
  id: string;
  provider: "instagram" | "messenger";
  external_account_id: string;
  page_id: string | null;
  name: string | null;
  status: string;
};

const PROVIDER_LABEL: Record<string, string> = {
  instagram: "Instagram Direct",
  messenger: "Facebook Messenger",
};

const EMPTY_FORM = {
  provider: "instagram" as "instagram" | "messenger",
  name: "",
  external_account_id: "",
  page_id: "",
  access_token: "",
};

export function SocialSettingsPanel() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/social/accounts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Erro ao carregar contas");
      setAccounts(data.accounts as SocialAccount[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Mostra o resultado do retorno do "Conectar com Facebook" (OAuth).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const oauthError = params.get("error");
    if (connected) setNotice(`${connected} conta(s) conectada(s) com sucesso pelo Facebook.`);
    else if (oauthError) {
      const messages: Record<string, string> = {
        oauth_unconfigured: "Login com Facebook ainda não configurado (faltam as credenciais do app Meta).",
        oauth_denied: "Você cancelou a autorização no Facebook.",
        oauth_state: "Sessão de conexão expirada. Tente novamente.",
        no_pages: "Nenhuma Página encontrada na sua conta do Facebook.",
        oauth_failed: "Não foi possível concluir a conexão. Tente novamente.",
        oauth_start: "Não foi possível iniciar a conexão.",
      };
      setError(messages[oauthError] || "Falha na conexão com o Facebook.");
    }
    if (connected || oauthError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Falha ao salvar");
      setNotice(`Conta ${PROVIDER_LABEL[form.provider]} conectada.`);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ABFAB]/30";

  return (
    <div className="space-y-6">
      <Card className="border-[#1877F2]/30 bg-[#1877F2]/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1B2F5B]">Conecte suas redes em um clique</CardTitle>
          <CardDescription>
            Clique abaixo, faça login no Facebook e escolha a Página. O Instagram vinculado a ela é conectado junto — você não precisa colar nada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/social/oauth/start"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1877F2] px-6 text-sm font-black text-white transition hover:bg-[#0f66d0]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
            </svg>
            Conectar com Facebook
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            A Meta só permite responder DMs até 24h após a última mensagem do cliente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Contas conectadas</CardTitle>
              <CardDescription>Instagram Direct e Facebook Messenger desta empresa.</CardDescription>
            </div>
            <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
              <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}

          {loading && accounts.length === 0 ? (
            <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm font-bold text-slate-700">Nenhuma conta conectada</p>
              <p className="mt-1 text-sm text-muted-foreground">Conecte o Instagram ou o Facebook abaixo para receber as DMs na central.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4">
                  <div>
                    <p className="font-bold text-slate-900">{acc.name || PROVIDER_LABEL[acc.provider]}</p>
                    <p className="text-xs text-muted-foreground">{PROVIDER_LABEL[acc.provider]} • ID {acc.external_account_id}</p>
                  </div>
                  <Badge variant={acc.status === "active" ? "success" : "secondary"}>{acc.status === "active" ? "Ativo" : "Desativado"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <details className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-bold text-slate-600 hover:text-[#1B2F5B]">
          <Plus className="h-5 w-5" />Opções avançadas — conectar manualmente com ID e token
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-6 pb-6 pt-4">
          <p className="text-sm text-muted-foreground">
            Use só se você já tem o ID da conta e um Page Access Token. O token fica guardado com segurança e nunca é exibido novamente.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Canal</label>
              <select
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as "instagram" | "messenger" }))}
                className={inputClass}
              >
                <option value="instagram">Instagram Direct</option>
                <option value="messenger">Facebook Messenger</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Nome (apelido interno)</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Lips Instagram" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">ID da conta (entry.id do webhook)</label>
              <input value={form.external_account_id} onChange={(e) => setForm((f) => ({ ...f, external_account_id: e.target.value }))} placeholder="Page id ou IG id" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Page ID (opcional)</label>
              <input value={form.page_id} onChange={(e) => setForm((f) => ({ ...f, page_id: e.target.value }))} placeholder="ID da Página do Facebook" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">Page Access Token</label>
              <textarea value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} rows={3} placeholder="Cole aqui o token de longa duração da página" className={`${inputClass} resize-none font-mono`} />
            </div>
          </div>
          <Button onClick={save} disabled={saving || !form.external_account_id.trim() || !form.access_token.trim()} className="bg-emerald-700 hover:bg-emerald-800">
            {saving ? "Conectando..." : "Conectar conta"}
          </Button>
        </div>
      </details>
    </div>
  );
}
