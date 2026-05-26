export type GroupExtractionStatus = "draft" | "reviewed" | "imported" | "blocked";

export interface WhatsAppGroupParticipant {
  id: string;
  name?: string;
  phone: string;
  isAdmin?: boolean;
  sourceGroupId: string;
  sourceGroupName: string;
}

export interface ExtractedContactListItem {
  id: string;
  name: string;
  phone: string;
  sourceGroups: string[];
  consentStatus: "unknown" | "opted_in" | "opted_out";
  crmStatus: "new" | "existing" | "duplicate";
  notes: string[];
}

export interface GroupContactExtractionResult {
  listName: string;
  status: GroupExtractionStatus;
  totalParticipants: number;
  uniqueContacts: number;
  duplicatesRemoved: number;
  contacts: ExtractedContactListItem[];
  warnings: string[];
}
