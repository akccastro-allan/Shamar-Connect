import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_SEGMENTS = [
  "birthday_today",
  "birthday_week",
  "inactive_30",
  "inactive_60",
  "inactive_90",
  "quote_followup",
] as const;

type Segment = (typeof VALID_SEGMENTS)[number];

type ContactRow = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  birth_date: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  last_purchase_at: string | null;
  last_service_at: string | null;
  last_quote_at: string | null;
  marketing_opt_in: boolean;
  marketing_opt_out_at: string | null;
  consent_status: string | null;
};

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function lastActive(contact: ContactRow) {
  const dates = [contact.last_purchase_at, contact.last_service_at].filter(Boolean) as string[];
  if (dates.length === 0) return null;
  return dates.sort().reverse()[0];
}

function filterOptedOut(contacts: ContactRow[]) {
  return contacts.filter(
    (c) => !c.marketing_opt_out_at && c.consent_status !== "opted_out",
  );
}

export async function GET(request: NextRequest) {
  try {
    const segment = request.nextUrl.searchParams.get("segment") as Segment | null;

    if (!segment || !VALID_SEGMENTS.includes(segment)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Segmento inválido. Use: ${VALID_SEGMENTS.join(", ")}`,
          validSegments: VALID_SEGMENTS,
        },
        { status: 400 },
      );
    }

    const db = createSupabaseServerClient();

    const { data, error } = await db
      .from("crm_contacts")
      .select(
        "id, name, phone, email, company, birth_date, birthday_month, birthday_day, last_purchase_at, last_service_at, last_quote_at, marketing_opt_in, marketing_opt_out_at, consent_status",
      )
      .order("name", { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const all = (data || []) as ContactRow[];
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    // Week range: today through 6 days ahead (wrap-around month not handled — acceptable for MVP)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      return { month: d.getMonth() + 1, day: d.getDate() };
    });

    let contacts: ContactRow[] = [];

    switch (segment) {
      case "birthday_today":
        contacts = all.filter(
          (c) => c.birthday_month === todayMonth && c.birthday_day === todayDay,
        );
        break;

      case "birthday_week":
        contacts = all.filter((c) =>
          c.birthday_month != null &&
          c.birthday_day != null &&
          weekDays.some((d) => d.month === c.birthday_month && d.day === c.birthday_day),
        );
        break;

      case "inactive_30":
        contacts = filterOptedOut(
          all.filter((c) => {
            const active = lastActive(c);
            return active ? active < daysAgo(30) : false;
          }),
        );
        break;

      case "inactive_60":
        contacts = filterOptedOut(
          all.filter((c) => {
            const active = lastActive(c);
            return active ? active < daysAgo(60) : false;
          }),
        );
        break;

      case "inactive_90":
        contacts = filterOptedOut(
          all.filter((c) => {
            const active = lastActive(c);
            return active ? active < daysAgo(90) : false;
          }),
        );
        break;

      case "quote_followup":
        contacts = filterOptedOut(
          all.filter(
            (c) =>
              c.last_quote_at != null &&
              c.last_quote_at < daysAgo(3) &&
              (c.last_purchase_at == null || c.last_purchase_at < c.last_quote_at),
          ),
        );
        break;
    }

    return NextResponse.json({
      ok: true,
      segment,
      total: contacts.length,
      contacts,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao carregar segmento" },
      { status: 500 },
    );
  }
}
