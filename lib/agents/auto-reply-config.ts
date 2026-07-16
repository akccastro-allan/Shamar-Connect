export type AutoReplyConfig = {
  organizationId: string;
  enabled: boolean;
  personaName: string;
  personaLabel: string;
  catalogEnabled: boolean;
  safeAutoReply: boolean;
  cooldownMinutes: number;
  quoteDepartment: string;
  quoteSlaMinutes: number;
  serviceDepartment: string;
  serviceSlaMinutes: number;
  purchaseDepartment: string;
  unknownDepartment: string;
  supervisorRole: string;
};

export const LIPS_ORGANIZATION_ID = "8f074193-bf58-4537-9842-720619a9f259";

export const LIPS_AUTO_REPLY_CONFIG: AutoReplyConfig = {
  organizationId: LIPS_ORGANIZATION_ID,
  enabled: true,
  personaName: "Gabi",
  personaLabel: "atendente virtual da Lips",
  catalogEnabled: true,
  safeAutoReply: true,
  cooldownMinutes: 5,
  quoteDepartment: "Balcão",
  quoteSlaMinutes: 20,
  serviceDepartment: "Oficina",
  serviceSlaMinutes: 10,
  purchaseDepartment: "Balcão",
  unknownDepartment: "Supervisor",
  supervisorRole: "supervisor",
};

export function getAutoReplyConfig(organizationId: string): AutoReplyConfig | null {
  if (organizationId === LIPS_AUTO_REPLY_CONFIG.organizationId) return LIPS_AUTO_REPLY_CONFIG;
  return null;
}
