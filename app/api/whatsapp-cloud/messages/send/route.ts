import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export async function POST() {
  try {
    await getRequiredAppContext();
    return NextResponse.json(
      { ok: false, error: "feature_disabled", message: "WhatsApp Cloud API indisponível neste release." },
      { status: 403 },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: "Falha ao validar acesso." }, { status: 500 });
  }
}
