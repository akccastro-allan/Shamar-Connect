import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

const PROVIDERS = new Set(["instagram", "messenger"]);

// Lista as contas sociais da empresa logada. Nunca devolve o access_token.
export async function GET() {
  try {
    const ctx = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("social_accounts")
      .select("id, provider, external_account_id, page_id, name, status, created_at, updated_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, accounts: data ?? [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao listar contas" }, { status: 500 });
  }
}

// Conecta (ou atualiza) uma conta de Instagram/Messenger da empresa logada.
export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    const body = await request.json();

    const provider = String(body?.provider || "");
    const externalAccountId = String(body?.external_account_id || "").trim();
    const accessToken = String(body?.access_token || "").trim();
    const pageId = body?.page_id ? String(body.page_id).trim() : null;
    const name = body?.name ? String(body.name).trim() : null;
    const verifyToken = body?.verify_token ? String(body.verify_token).trim() : null;

    if (!PROVIDERS.has(provider)) {
      return NextResponse.json({ ok: false, error: "Provider inválido (use instagram ou messenger)." }, { status: 400 });
    }
    if (!externalAccountId) {
      return NextResponse.json({ ok: false, error: "Informe o ID da conta (Page id ou IG id)." }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Informe o token de acesso da página." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("social_accounts")
      .upsert(
        {
          tenant_id: ctx.tenantId,
          organization_id: ctx.organizationId,
          provider,
          external_account_id: externalAccountId,
          page_id: pageId,
          name,
          access_token: accessToken,
          verify_token: verifyToken,
          status: "active",
          updated_at: now,
        },
        { onConflict: "provider,external_account_id" },
      )
      .select("id, provider, external_account_id, page_id, name, status")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, account: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao salvar conta" }, { status: 500 });
  }
}
