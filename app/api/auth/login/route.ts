import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { normalizeDocument, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const companyDocument = normalizeDocument(body?.companyDocument);
    const userDocument = normalizeDocument(body?.userDocument);
    const accessCode = String(body?.accessCode || "").trim();

    if (!companyDocument || !userDocument || !accessCode) {
      return NextResponse.json({ ok: false, error: "Documento da empresa, documento do usuário e código são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    const { data: company, error: companyError } = await db
      .from("companies")
      .select("id, name, document_type, document_number, status")
      .eq("document_number", companyDocument)
      .eq("status", "active")
      .single();

    if (companyError || !company) {
      return NextResponse.json({ ok: false, error: "Empresa não encontrada ou inativa." }, { status: 401 });
    }

    const { data: user, error: userError } = await db
      .from("company_users")
      .select("id, name, role, cpf, email, is_active, access_code")
      .eq("company_id", company.id)
      .eq("cpf", userDocument)
      .eq("is_active", true)
      .single();

    if (userError || !user || user.access_code !== accessCode) {
      return NextResponse.json({ ok: false, error: "Usuário ou código inválido." }, { status: 401 });
    }

    const session = {
      companyId: company.id,
      companyName: company.name,
      documentType: company.document_type,
      documentNumber: company.document_number,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      loginAt: new Date().toISOString(),
    };

    await setSessionCookie(session);

    return NextResponse.json({ ok: true, session });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha no login" }, { status: 500 });
  }
}
