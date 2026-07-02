/**
 * SLA calculator — on-demand, sem dependência de cron.
 * Roda na Central quando a conversa é carregada.
 */

import { LIPS_ROUTING, isWithinBusinessHours, getNextBusinessHourStart } from "@/lib/tenant-routing";

export type SlaStatus = "ok" | "attention" | "overdue" | "outside_hours";

export type SlaInfo = {
  status: SlaStatus;
  department: string | null;
  slaMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  percentageUsed: number;
  lastInboundAt: string | null;
  withinBusinessHours: boolean;
  nextBusinessHourStart: string | null;
};

const SLA_BY_DEPT: Record<string, number> = {
  Balcão: 30,
  Oficina: 50,
  Geral: 60,
};
const DEFAULT_SLA = 60;

function slaMinutesForDept(deptName: string | null): number {
  if (!deptName) return DEFAULT_SLA;
  return SLA_BY_DEPT[deptName] ?? DEFAULT_SLA;
}

/**
 * Calcula SLA on-demand — sem chamar servidor.
 * Roda no cliente quando a Central carrega uma conversa.
 *
 * Lógica:
 * - Fora de horário comercial: não contar como atraso
 * - Dentro de horário: calcular tempo decorrido vs SLA
 * - Status: ok (<50%), attention (50-100%), overdue (>100%)
 */
export function calculateSlaStatus(params: {
  lastInboundAt: string | null;
  deptName: string | null;
  now?: Date;
}): SlaInfo {
  const { lastInboundAt, deptName, now = new Date() } = params;

  const inBusinessHours = isWithinBusinessHours(LIPS_ROUTING, now);
  const nextStart = getNextBusinessHourStart(LIPS_ROUTING, now);
  const slaMins = slaMinutesForDept(deptName);

  // No inbound yet
  if (!lastInboundAt) {
    return {
      status: "ok",
      department: deptName,
      slaMinutes: slaMins,
      elapsedMinutes: 0,
      remainingMinutes: inBusinessHours ? slaMins : 0,
      percentageUsed: 0,
      lastInboundAt: null,
      withinBusinessHours: inBusinessHours,
      nextBusinessHourStart: nextStart,
    };
  }

  const lastInbound = new Date(lastInboundAt);
  const elapsedMs = now.getTime() - lastInbound.getTime();
  const elapsedMins = Math.floor(elapsedMs / 60_000);

  // Outside business hours: don't count as breach
  if (!inBusinessHours) {
    return {
      status: "outside_hours",
      department: deptName,
      slaMinutes: slaMins,
      elapsedMinutes: elapsedMins,
      remainingMinutes: 0,
      percentageUsed: 0,
      lastInboundAt,
      withinBusinessHours: false,
      nextBusinessHourStart: nextStart,
    };
  }

  // During business hours: check SLA
  const remaining = Math.max(0, slaMins - elapsedMins);
  const percentage = Math.round((elapsedMins / slaMins) * 100);

  let status: SlaStatus;
  if (elapsedMins > slaMins) {
    status = "overdue";
  } else if (elapsedMins > slaMins * 0.5) {
    status = "attention";
  } else {
    status = "ok";
  }

  return {
    status,
    department: deptName,
    slaMinutes: slaMins,
    elapsedMinutes: elapsedMins,
    remainingMinutes: remaining,
    percentageUsed: percentage,
    lastInboundAt,
    withinBusinessHours: true,
    nextBusinessHourStart: nextStart,
  };
}

/**
 * Formata o status em linguagem humana.
 */
export function formatSlaStatus(info: SlaInfo): string {
  if (info.status === "outside_hours") {
    return `Fora do horário comercial. Próxima abertura: ${info.nextBusinessHourStart ? new Date(info.nextBusinessHourStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}`;
  }

  if (info.status === "ok") {
    return `${info.department ?? "Geral"}: ${info.remainingMinutes} min restantes (SLA ${info.slaMinutes} min)`;
  }

  if (info.status === "attention") {
    return `⚠️ ${info.department ?? "Geral"}: ${info.remainingMinutes} min restantes (SLA ${info.slaMinutes} min) — Atençao`;
  }

  // overdue
  return `🔴 ${info.department ?? "Geral"}: SLA estourado há ${info.elapsedMinutes - info.slaMinutes} min (SLA era ${info.slaMinutes} min)`;
}

/**
 * Retorna cor para exibição visual.
 */
export function slaStatusColor(status: SlaStatus): string {
  switch (status) {
    case "ok":
      return "emerald"; // verde
    case "attention":
      return "amber"; // amarelo
    case "overdue":
      return "red"; // vermelho
    case "outside_hours":
      return "slate"; // cinza
  }
}
