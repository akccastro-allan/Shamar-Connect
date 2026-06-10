import { redirect } from "next/navigation";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { clearSessionCookie, getCurrentSession, type ShamarSession } from "@/lib/auth/session";

export type VerifiedShamarSession = ShamarSession & {
  companyStatus: string;
  userIsActive: boolean;
};

export async function getVerifiedSession(): Promise<VerifiedShamarSession | null> {
  const session = await getCurrentSession();

  if (!session?.companyId || !session?.userId) {
    return null;
  }

  const db = createSupabaseWriteClient();

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id, name, document_type, document_number, status")
    .eq("id", session.companyId)
    .eq("status", "active")
    .single();

  if (companyError || !company) {
    await clearSessionCookie();
    return null;
  }

  const { data: user, error: userError } = await db
    .from("company_users")
    .select("id, name, role, cpf, email, is_active")
    .eq("id", session.userId)
    .eq("company_id", company.id)
    .eq("is_active", true)
    .single();

  if (userError || !user) {
    await clearSessionCookie();
    return null;
  }

  return {
    ...session,
    companyId: company.id,
    companyName: company.name,
    documentType: company.document_type,
    documentNumber: company.document_number,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    companyStatus: company.status,
    userIsActive: user.is_active,
  };
}

export async function requireVerifiedSession() {
  const session = await getVerifiedSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
