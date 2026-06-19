"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactCreateDialog } from "@/components/contact-create-dialog";

type Contact = {
  id: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  consent_status?: string | null;
  tags?: string[] | null;
  updated_at?: string | null;
};

async function loadContacts() {
  const response = await fetch("/api/crm/contacts", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao carregar contatos");
  return (data.contacts || []) as Contact[];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ContactsPanel() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setContacts(await loadContacts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function handleSaved(contact: Contact, existing: boolean) {
    setDialogOpen(false);
    setNotice(existing ? "Este contato já existe na base." : `Contato "${contact.name || contact.phone}" salvo com sucesso.`);
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <ContactCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Contatos do CRM</CardTitle>
              <CardDescription>Contatos salvos manualmente a partir de conversas ou grupos selecionados.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="mr-2 h-4 w-4" />Novo contato
              </Button>
              <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}
          {contacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum contato salvo ainda.{" "}
              <button onClick={() => setDialogOpen(true)} className="font-medium text-emerald-700 hover:underline">
                Adicionar o primeiro contato.
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Consentimento</th>
                    <th className="px-4 py-3">Tags</th>
                    <th className="px-4 py-3">Atualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">{contact.name || "—"}</td>
                      <td className="px-4 py-3">{contact.phone}</td>
                      <td className="px-4 py-3">{contact.source || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={contact.consent_status === "opted_in" ? "success" : contact.consent_status === "opted_out" ? "destructive" : "outline"}>
                          {contact.consent_status || "unknown"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(contact.tags || []).slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(contact.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
