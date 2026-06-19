"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ContactResult = {
  id: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  consent_status?: string | null;
  tags?: string[] | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (contact: ContactResult, existing: boolean) => void;
  initialPhone?: string;
  initialName?: string;
  defaultSource?: string;
  defaultTags?: string[];
};

const CONSENT_OPTIONS = [
  { value: "unknown", label: "Não informado" },
  { value: "opted_in", label: "Sim, aceita receber mensagens" },
  { value: "opted_out", label: "Não, pediu para não receber" },
];

export function ContactCreateDialog({ open, onClose, onSaved, initialPhone = "", initialName = "", defaultSource = "manual", defaultTags = [] }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [lastPurchaseAt, setLastPurchaseAt] = useState("");
  const [lastServiceAt, setLastServiceAt] = useState("");
  const [consentStatus, setConsentStatus] = useState("unknown");
  const [tagsRaw, setTagsRaw] = useState(defaultTags.join(", "));
  const [notes, setNotes] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    if (!phone.trim()) {
      setError("Telefone é obrigatório.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const response = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim(),
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          source: defaultSource,
          tags: tags.length > 0 ? tags : undefined,
          consent_status: consentStatus,
          notes: notes.trim() || undefined,
          birth_date: birthDate || undefined,
          last_purchase_at: lastPurchaseAt ? new Date(lastPurchaseAt).toISOString() : undefined,
          last_service_at: lastServiceAt ? new Date(lastServiceAt).toISOString() : undefined,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || "Erro ao salvar contato.");
        return;
      }

      if (data.existing) {
        setNotice("Este contato já existe. Abrindo cadastro existente.");
      }

      onSaved(data.contact, Boolean(data.existing));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Novo contato</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre um contato para atendimento, vendas ou relacionamento.</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
          {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div> : null}

          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp <span className="text-red-500">*</span></label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: (21) 99999-9999"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-muted-foreground">Aceita qualquer formato — será salvo normalizado.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            {showAdvanced ? "Ocultar opções avançadas ▲" : "Mostrar mais opções ▼"}
          </button>

          {showAdvanced && (
            <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Empresa</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">E-mail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Data de aniversário</label>
                <input
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  type="date"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Última compra</label>
                <input
                  value={lastPurchaseAt}
                  onChange={(e) => setLastPurchaseAt(e.target.value)}
                  type="date"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Último atendimento</label>
                <input
                  value={lastServiceAt}
                  onChange={(e) => setLastServiceAt(e.target.value)}
                  type="date"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Aceita receber mensagens?</label>
                <select
                  value={consentStatus}
                  onChange={(e) => setConsentStatus(e.target.value)}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {CONSENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Tags</label>
                <input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  placeholder="Ex: cliente, vip, whatsapp"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <p className="mt-1 text-xs text-muted-foreground">Separe por vírgula.</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Informações adicionais sobre o contato..."
                  className="w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !phone.trim()} className="bg-emerald-700 hover:bg-emerald-800">
            {saving ? "Salvando..." : "Salvar contato"}
          </Button>
        </div>
      </div>
    </div>
  );
}
