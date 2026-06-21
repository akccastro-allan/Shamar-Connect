/**
 * Callback do "Conectar com Facebook".
 * Troca o code por token, lista as Páginas (com IG vinculado) e conecta
 * automaticamente cada conta em social_accounts para a empresa logada.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  listManagedPages,
} from "@/lib/providers/meta-social-client";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const back = (params: string) => NextResponse.redirect(new URL(`/settings/social?${params}`, request.url));

  try {
    const ctx = await getRequiredAppContext();

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = request.cookies.get("social_oauth_state")?.value;

    if (url.searchParams.get("error")) {
      return back("error=oauth_denied");
    }
    if (!code || !state || !expectedState || state !== expectedState) {
      return back("error=oauth_state");
    }

    const redirectUri = `${url.origin}/api/social/oauth/callback`;
    const userToken = await exchangeCodeForToken(code, redirectUri);
    const pages = await listManagedPages(userToken);

    if (!pages.length) {
      return back("error=no_pages");
    }

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];

    for (const page of pages) {
      // Messenger usa o id da Página como entry.id do webhook.
      rows.push({
        tenant_id: ctx.tenantId,
        organization_id: ctx.organizationId,
        provider: "messenger",
        external_account_id: page.id,
        page_id: page.id,
        name: page.name,
        access_token: page.accessToken,
        status: "active",
        updated_at: now,
      });
      // Instagram usa o id da conta business vinculada como entry.id.
      if (page.instagram) {
        rows.push({
          tenant_id: ctx.tenantId,
          organization_id: ctx.organizationId,
          provider: "instagram",
          external_account_id: page.instagram.id,
          page_id: page.id,
          name: page.instagram.username ? `@${page.instagram.username}` : page.name,
          access_token: page.accessToken,
          status: "active",
          updated_at: now,
        });
      }
    }

    const { error } = await db
      .from("social_accounts")
      .upsert(rows, { onConflict: "provider,external_account_id" });

    if (error) throw error;

    const response = back(`connected=${rows.length}`);
    response.cookies.delete("social_oauth_state");
    return response;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.error("[social-oauth-callback]", error instanceof Error ? error.message : error);
    return back("error=oauth_failed");
  }
}
