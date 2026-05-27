"use client";

import { useState } from "react";
import { FileText, Mail, Upload, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImportSource = "manual_paste" | "txt" | "csv" | "spreadsheet";

type ImportResult = {
  ok: boolean;
  imported?: number;
  error?: string;
};

async function importContacts(text: string, source: ImportSource) {
  const response = await fetch("/api/contacts/import-text", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, source }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao importar contatos");
  return data as ImportResult;
}

export function ContactImportHubPanel() {
  const [source, setSource] = useState<ImportSource>("manual_paste");
  const [text, setText] = useState("Nome;Telefone;Email;Empresa\nJoão Silva;21999999999;joao@email.com;Empresa X");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await importContacts(text, source);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar contatos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Central de importação de contatos</CardTitle>
          <CardDescription>Importe contatos por colagem, TXT, CSV ou planilha copiada. Google e Microsoft ficam preparados para a próxima fase com OAuth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl border bg-white p-4">
              <FileText className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 font-medium">TXT</p>
              <p className="text-xs text-muted-foreground">Cole uma lista simples.</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <FileText className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 font-medium">CSV</p>
              <p className="text-xs text-muted-foreground">Separado por vírgula ou ponto e vírgula.</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <FileText className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 font-medium">Planilha</p>
              <p className="text-xs text-muted-foreground">Copie e cole do Excel ou Sheets.</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4 opacity-80">
              <Mail className="h-5 w-5 text-slate-500" />
              <p className="mt-2 font-medium">Google</p>
              <p className="text-xs text-muted-foreground">Próxima fase.</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4 opacity-80">
              <Users className="h-5 w-5 text-slate-500" />
              <p className="mt-2 font-medium">Microsoft</p>
              <p className="text-xs text-muted-foreground">Próxima fase.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fonte da importação</label>
              <select value={source} onChange={(event) => setSource(event.target.value as ImportSource)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="manual_paste">Colagem manual</option>
                <option value="txt">TXT</option>
                <option value="csv">CSV</option>
                <option value="spreadsheet">Planilha copiada</option>
              </select>
              <div className="rounded-2xl border bg-amber-50 p-3 text-xs text-amber-900">
                Os contatos entram com consentimento desconhecido e precisam de revisão antes de campanhas em massa.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cole os contatos</label>
              <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} className="w-full rounded-2xl border bg-white p-3 text-sm" placeholder="Nome;Telefone;Email;Empresa" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleImport} disabled={loading || !text.trim()}>
              <Upload className="mr-2 h-4 w-4" />Importar para o CRM
            </Button>
            <Badge variant="secondary">Remove duplicados</Badge>
            <Badge variant="outline">Salva em crm_contacts</Badge>
            <Badge variant="outline">Consentimento unknown</Badge>
          </div>

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {result ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Importação concluída. Contatos importados/atualizados: {result.imported || 0}.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
