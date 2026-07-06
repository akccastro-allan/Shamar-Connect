import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    if (body.event === "message.received" && body.sessionId && body.data) {
      const data = body.data as Record<string, unknown>;
      if (data.key && typeof data.key === "object") {
        const key = data.key as Record<string, unknown>;
        console.log(`[openwa] Message from ${key.remoteJid}`);
      }
    }
  } catch (err) {
    console.error("[openwa-webhook] Error:", err);
  }

  return NextResponse.json({ ok: true });
}
