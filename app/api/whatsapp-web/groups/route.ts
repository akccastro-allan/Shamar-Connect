import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../_auth";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const groups = await session.resolved.client.listGroups();
    return NextResponse.json({ ok: true, groups });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load groups" }, { status: 500 });
  }
}
