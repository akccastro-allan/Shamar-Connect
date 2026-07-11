import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Endpoint legado desativado. Use a importação via sessão validada." },
    { status: 410 },
  );
}
