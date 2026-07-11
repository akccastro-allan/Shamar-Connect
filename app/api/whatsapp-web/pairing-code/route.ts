import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../_auth";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const result = await session.resolved.client.getQr();
    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to load pairing code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
