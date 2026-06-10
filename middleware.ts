import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.SHAMAR_AGENT_API_ENABLED !== "true") {
    return NextResponse.json(
      {
        ok: false,
        error: "Shamar Agent API desativada neste ambiente.",
      },
      { status: 503 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/integrations/agent/:path*"],
};
