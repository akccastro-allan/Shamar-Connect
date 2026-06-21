/**
 * Início do fluxo "Conectar com Facebook" (OAuth).
 * Gera um state anti-CSRF (cookie httpOnly) e redireciona para o diálogo da Meta.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { buildLoginUrl, isOAuthConfigured } from "@/lib/providers/meta-social-client";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await getRequiredAppContext(); // exige sessão; o tenant é lido de novo no callback

    if (!isOAuthConfigured()) {
      return NextResponse.redirect(new URL("/settings/social?error=oauth_unconfigured", request.url));
    }

    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/social/oauth/callback`;
    const state = randomUUID();

    const response = NextResponse.redirect(buildLoginUrl(redirectUri, state));
    response.cookies.set("social_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/settings/social?error=oauth_start", request.url));
  }
}
