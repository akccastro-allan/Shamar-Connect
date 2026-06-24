import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ listId: string }> };

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_request: NextRequest, context: Params) {
  try {
    const appContext = await getRequiredAppContext();
    const { listId } = await context.params;
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("group_contact_list_items")
      .select("name, phone, source_group_name, consent_status, crm_status, review_status, created_at")
      .eq("organization_id", appContext.organizationId)
      .eq("list_id", listId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = data || [];
    const header = ["nome", "telefone", "grupo", "consentimento", "crm_status", "review_status", "criado_em"];
    const csv = [
      header.map(csvEscape).join(","),
      ...rows.map((row) => [row.name, row.phone, row.source_group_name, row.consent_status, row.crm_status, row.review_status, row.created_at].map(csvEscape).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="shamar-connect-lista-${listId}.csv"`,
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to export CSV" }, { status: 500 });
  }
}
