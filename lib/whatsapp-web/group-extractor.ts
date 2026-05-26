import type { ExtractedContactListItem, GroupContactExtractionResult, WhatsAppGroupParticipant } from "@/types/whatsapp-web";

function normalizePhone(phone: string) {
  return phone.replaceAll(" ", "").replaceAll("-", "").replaceAll("(", "").replaceAll(")", "");
}

function displayName(participant: WhatsAppGroupParticipant) {
  return participant.name?.trim() || participant.phone;
}

export function extractGroupParticipantsToList(params: {
  listName: string;
  participants: WhatsAppGroupParticipant[];
  existingPhones?: string[];
  optedOutPhones?: string[];
}): GroupContactExtractionResult {
  const existing = new Set((params.existingPhones ?? []).map(normalizePhone));
  const optedOut = new Set((params.optedOutPhones ?? []).map(normalizePhone));
  const contactsByPhone = new Map<string, ExtractedContactListItem>();
  let duplicatesRemoved = 0;

  for (const participant of params.participants) {
    const phone = normalizePhone(participant.phone);
    const current = contactsByPhone.get(phone);

    if (current) {
      duplicatesRemoved += 1;
      if (!current.sourceGroups.includes(participant.sourceGroupName)) {
        current.sourceGroups.push(participant.sourceGroupName);
      }
      current.notes.push(`Também encontrado em ${participant.sourceGroupName}.`);
      continue;
    }

    contactsByPhone.set(phone, {
      id: `contact_${phone}`,
      name: displayName(participant),
      phone,
      sourceGroups: [participant.sourceGroupName],
      consentStatus: optedOut.has(phone) ? "opted_out" : "unknown",
      crmStatus: existing.has(phone) ? "existing" : "new",
      notes: participant.isAdmin ? ["Participante é administrador do grupo."] : [],
    });
  }

  const contacts = Array.from(contactsByPhone.values());

  return {
    listName: params.listName,
    status: "draft",
    totalParticipants: params.participants.length,
    uniqueContacts: contacts.length,
    duplicatesRemoved,
    contacts,
    warnings: [
      "Lista criada apenas para organização e qualificação comercial.",
      "Não enviar campanhas para contatos sem consentimento explícito.",
      "Antes de integrar com API oficial, converter contatos qualificados em opt-in verificável.",
    ],
  };
}

export const mockGroupParticipants: WhatsAppGroupParticipant[] = [
  { id: "p1", name: "Ana Carvalho", phone: "+55 11 90000-1001", sourceGroupId: "g1", sourceGroupName: "Leads Evento Saúde" },
  { id: "p2", name: "Pr. Marcos Lima", phone: "+55 21 90000-1002", sourceGroupId: "g2", sourceGroupName: "Pastores e Gestores" },
  { id: "p3", name: "Júlia Mendes", phone: "+55 31 90000-1003", sourceGroupId: "g1", sourceGroupName: "Leads Evento Saúde" },
  { id: "p4", name: "Ana Carvalho", phone: "+55 11 90000-1001", sourceGroupId: "g3", sourceGroupName: "Networking Varejo" },
  { id: "p5", phone: "+55 41 90000-1004", sourceGroupId: "g3", sourceGroupName: "Networking Varejo", isAdmin: true },
];
