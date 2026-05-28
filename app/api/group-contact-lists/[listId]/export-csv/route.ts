import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ listId: string }> };

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const { listId } = await context.params;
    const reviewStatus = request.nextUrl.searchParams.get("reviewStatus");
    const db = createSupabaseServerClient();

    let query = db
      .from("group_contact_list_items")
      .select("name, phone, source_group_name, consent_status, crm_status, review_status, created_at")
      .eq("list_id", listId)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (reviewStatus && ["pending", "approved", "rejected"].includes(reviewStatus)) {
      query = query.eq("review_status", reviewStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    const header = ["nome", "telefone", "grupo_origem", "consentimento", "crm", "revisao", "criado_em"];
    const rows = (data || []).map((item) => [
      item.name,
      item.phone,
      item.source_group_name,
      item.consent_status,
      item.crm_status,
      item.review_status,
      item.created_at,
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="shamarconnect-lista-${listId}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to export CSV" }, { status: 500 });
  }
}
