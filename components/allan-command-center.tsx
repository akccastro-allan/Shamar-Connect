"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SupportSummary = { open: number; urgent: number };
type BroadcastSummary = { drafts: number; published: number };

export function AllanCommandCenter() {
  const [support, setSupport] = useState<SupportSummary | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastSummary | null>(null);
  const [contactsTotal, setContactsTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [ticketsRes, broadcastsRes, contactsRes] = await Promise.allSettled([
        fetch("/api/support/tickets?limit=200", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/distribution/broadcasts", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/crm/contacts?limit=1", { cache: "no-store" }).then((r) => r.json()),
      ]);

      if (ticketsRes.status === "fulfilled" && ticketsRes.value.ok) {
        const tickets: Array<{ status: string; priority: string }> = ticketsRes.value.tickets ?? [];
        setSupport({
          open: tickets.filter((t) => t.status === "open").length,
          urgent: tickets.filter((t) => t.priority === "urgent").length,
        });
      }

      if (broadcastsRes.status === "fulfilled" && broadcastsRes.value.ok) {
        const list: Array<{ status: string }> = broadcastsRes.value.broadcasts ?? [];
        setBroadcasts({
          drafts: list.filter((b) => b.status === "draft" || b.status === "ready").length,
          published: list.filter((b) => b.status === "published").length,
        });
      }

      if (contactsRes.status === "fulfilled") {
        setContactsTotal(contactsRes.value.total ?? contactsRes.value.contacts?.length ?? null);
      }

      setLastChecked(new Date().toLocaleTimeString("pt-BR"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const units = [
    {
      name: "Shamar — Suporte",
      href: "/admin/support",
      color: "#1B2F5B",
      items: support
        ? [
            { label: "Chamados abertos", value: support.open, alert: support.open > 0 },
            { label: "Urgentes", value: support.urgent, alert: support.urgent > 0 },
          ]
        : null,
    },
    {
      name: "Viciados em Trilhas",
      href: "/distribution",
      color: "#2ABFAB",
      items: [
        { label: "Contatos CRM", value: contactsTotal ?? "—", alert: false },
        { label: "Broadcasts em rascunho", value: broadcasts?.drafts ?? "—", alert: (broadcasts?.drafts ?? 0) > 0 },
      ],
    },
    {
      name: "Oriahfin",
      href: "/pipeline",
      color: "#C9952A",
      items: null,
      placeholder: "Em preparação",
    },
    {
      name: "MK Shalom",
      href: "/pipeline",
      color: "#8B5CF6",
      items: null,
      placeholder: "Em preparação",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-slate-900">Outras unidades</h2>
        <div className="flex items-center gap-3">
          {lastChecked && <span className="text-xs text-muted-foreground">Atualizado às {lastChecked}</span>}
          <Button onClick={loadAll} disabled={loading} variant="outline" size="sm">
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {units.map((unit) => (
          <Link
            key={unit.name}
            href={unit.href}
            className="group block rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderLeftColor: unit.color, borderLeftWidth: 4 }}
          >
            <p className="text-sm font-black text-slate-800">{unit.name}</p>

            {unit.placeholder ? (
              <p className="mt-3 text-xs text-muted-foreground">{unit.placeholder}</p>
            ) : unit.items ? (
              <div className="mt-3 space-y-2">
                {unit.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span
                      className={`text-sm font-bold ${
                        item.alert ? "text-amber-700" : "text-slate-700"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Carregando...</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
