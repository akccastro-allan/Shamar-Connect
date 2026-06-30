/**
 * Utilitários de roteamento por tenant: horário comercial, SLA e escalação.
 * Timezone e regras vêm de metadata do tenant; fallback para Lips (America/Sao_Paulo).
 */

export type Department = "Balcão" | "Oficina" | "Geral";

export type RoutingConfig = {
  timezone: string;
  businessHours: {
    [day: number]: { open: string; close: string } | null;
    // day: 0=Dom, 1=Seg ... 6=Sáb
  };
  sla: Record<Department, number>;  // minutos
  escalateTo: "supervisor";
};

export const LIPS_ROUTING: RoutingConfig = {
  timezone: "America/Sao_Paulo",
  businessHours: {
    0: null,                          // Domingo: fechado
    1: { open: "08:00", close: "18:00" },
    2: { open: "08:00", close: "18:00" },
    3: { open: "08:00", close: "18:00" },
    4: { open: "08:00", close: "18:00" },
    5: { open: "08:00", close: "18:00" },
    6: { open: "08:00", close: "15:00" }, // Sábado
  },
  sla: {
    Balcão: 30,
    Oficina: 50,
    Geral: 60,
  },
  escalateTo: "supervisor",
};

function toLocalTime(date: Date, timezone: string): { dayOfWeek: number; hhmm: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    dayOfWeek: weekdayMap[weekdayShort] ?? 0,
    hhmm: `${hour}:${minute}`,
  };
}

export function isWithinBusinessHours(config: RoutingConfig, at?: Date): boolean {
  const now = at ?? new Date();
  const { dayOfWeek, hhmm } = toLocalTime(now, config.timezone);
  const hours = config.businessHours[dayOfWeek];
  if (!hours) return false;
  return hhmm >= hours.open && hhmm < hours.close;
}

export type RoutingResult = {
  department: Department;
  slaMinutes: number;
  withinBusinessHours: boolean;
  outOfHoursMessage: string | null;
  shouldEscalate: boolean;
};

export function resolveDepartmentRouting(department: Department, config: RoutingConfig = LIPS_ROUTING, at?: Date): RoutingResult {
  const withinBusinessHours = isWithinBusinessHours(config, at);

  const outOfHoursMessage = withinBusinessHours
    ? null
    : "Recebemos sua mensagem! Nosso horário de atendimento é de segunda a sexta das 8h às 18h e sábados das 8h às 15h. Responderemos assim que abrirmos.";

  return {
    department,
    slaMinutes: config.sla[department] ?? 60,
    withinBusinessHours,
    outOfHoursMessage,
    shouldEscalate: false,  // jobs de escalação disparam via watchdog, não aqui
  };
}
