export type HandoffDepartment = "Atendimento" | "Balcão" | "Oficina" | "Supervisor" | "Encomendas";

export type HandoffRule = {
  intent: string;
  department: HandoffDepartment;
  reason: string;
  autoReply: string;
};

export type OrganizationAutomationProfile = {
  organizationId: string;
  enabled: boolean;
  personaName: string;
  personaLabel: string;
  greetingMessage: string;
  menuOptions: Array<{
    key: string;
    label: string;
    intent: string;
  }>;
  catalogEnabled: boolean;
  safeAutoReply: boolean;
  categories: string[];
  safeActions: string[];
  blockedActions: string[];
  handoffRules: HandoffRule[];
  cooldownMinutes: number;
};

export function formatAutomationMenu(profile: OrganizationAutomationProfile) {
  return [
    profile.greetingMessage,
    "",
    ...profile.menuOptions.map((option, index) => `${index + 1}. ${option.label}`),
  ].join("\n");
}
