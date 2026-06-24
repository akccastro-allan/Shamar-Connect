/**
 * Marco 1 — Identidade de contato por canal (contact_identities).
 *
 * crm_contacts continua sendo a PESSOA; contact_identities guarda cada
 * (channel_id, external_id) -> contact_id. IDs sociais (PSID) NUNCA vão para
 * crm_contacts.phone — só telefone real é gravado em phone.
 */

import type { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Db = ReturnType<typeof createSupabaseWriteClient>;

export type IdentityType = "phone" | "wa_id" | "ig_psid" | "fb_psid" | "lid";

export type ResolveContactInput = {
  tenantId: string;
  organizationId: string;
  channelId: string;
  provider: string;
  identityType: IdentityType;
  externalId: string;
  displayName?: string | null;
};

/**
 * Encontra ou cria o contato associado a uma identidade de canal.
 * Idempotente por (channel_id, external_id). Retorna o contact_id.
 */
export async function resolveOrCreateContactByIdentity(
  db: Db,
  input: ResolveContactInput,
): Promise<string> {
  const { tenantId, organizationId, channelId, provider, identityType, externalId } = input;
  const displayName = input.displayName || externalId;
  const now = new Date().toISOString();

  // 1) Identidade já existe para este canal? (fonte de verdade por canal)
  const { data: identity } = await db
    .from("contact_identities")
    .select("id, contact_id")
    .eq("channel_id", channelId)
    .eq("external_id", externalId)
    .maybeSingle();

  if (identity?.contact_id) {
    await db
      .from("contact_identities")
      .update({ display_name: displayName, updated_at: now })
      .eq("id", identity.id);
    return identity.contact_id;
  }

  // 2) Resolver/criar o crm_contact (a pessoa).
  const isPhone = identityType === "phone" || identityType === "wa_id";
  let contactId: string | null = null;

  if (isPhone) {
    // Telefone: reusa o contato existente da org (org, phone) se houver.
    const { data: existing } = await db
      .from("crm_contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("phone", externalId)
      .maybeSingle();
    contactId = existing?.id ?? null;
  }

  if (!contactId) {
    const { data: created, error } = await db
      .from("crm_contacts")
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId,
        // IDs sociais NÃO entram em phone — só telefone real.
        phone: isPhone ? externalId : null,
        name: displayName,
        source: provider,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    contactId = created.id;
  }

  if (!contactId) throw new Error("Falha ao resolver/criar contato.");

  // 3) Gravar a identidade do canal (idempotente; corre com outro insert paralelo).
  const { error: identityError } = await db.from("contact_identities").insert({
    tenant_id: tenantId,
    organization_id: organizationId,
    contact_id: contactId,
    channel_id: channelId,
    provider,
    identity_type: identityType,
    external_id: externalId,
    display_name: displayName,
    created_at: now,
    updated_at: now,
  });

  // Se outra requisição criou a mesma identidade (unique channel_id+external_id),
  // relê e usa o contato dela.
  if (identityError) {
    const { data: raced } = await db
      .from("contact_identities")
      .select("contact_id")
      .eq("channel_id", channelId)
      .eq("external_id", externalId)
      .maybeSingle();
    if (raced?.contact_id) return raced.contact_id;
    throw identityError;
  }

  return contactId;
}
