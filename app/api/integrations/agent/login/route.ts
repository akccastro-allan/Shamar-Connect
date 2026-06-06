import { NextRequest, NextResponse } from "next/server";

import { AgentAuthError, assertSetupToken } from "@/lib/integrations/agent-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));

    assertSetupToken(
      request,
      typeof body?.setupToken === "string" ? body.setupToken : undefined,
    );

    return NextResponse.json({
      ok: true,
      mode: "setup_token",
      message: "Login técnico autorizado para configuração do Shamar Agent.",
    });
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao validar login técnico do Shamar Agent.",
      },
      { status: 500 },
    );
  }
}
