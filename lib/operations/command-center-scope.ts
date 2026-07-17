import { commandCenterEntities } from "../admin/command-center-config.ts";

export const companySlugByName: Record<string, string> = {
  "Moriah Systems": "moriah-systems",
  "Allan / Pessoal": "allan-pessoal",
  "Viciados em Trilhas": "viciados-em-trilhas",
  "MK Shalom": "mk-shalom",
  "Shamar Connect": "shamar-connect",
  "Shamar ERP": "shamar-erp",
  "Shamar Church": "shamar-church",
  "Shamar Kids": "shamar-kids",
  "Shamar Events": "shamar-events",
  OriahFin: "oriahfin",
};

export const internalCompanyNames = commandCenterEntities.map((entity) => entity.name);
export const internalCompanyNameSet = new Set(internalCompanyNames.map((name) => name.toLowerCase()));
export const internalCompanySlugSet = new Set(Object.values(companySlugByName));
export const allowedOperationsCompanySlugs = new Set(Object.values(companySlugByName));

export const internalWhatsappSessions = [
  "allan-01",
  "viciados-01",
  "mkshalom-01",
  "shamar-main",
  "shamarerp-main",
  "shamarkids-main",
] as const;

export const internalWhatsappSessionSet = new Set<string>(internalWhatsappSessions);

export function isAllowedOperationsCompanySlug(slug: string) {
  return allowedOperationsCompanySlugs.has(slug);
}

export function getOperationsCompanySlugs() {
  return [...allowedOperationsCompanySlugs];
}
