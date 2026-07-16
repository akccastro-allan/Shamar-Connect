import { redirect } from "next/navigation";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { requireWhatsappSyncDiagnosticsOperator } from "@/lib/whatsapp-sync/diagnostics";

export const dynamic = "force-dynamic";

export default async function LegacyAdminWhatsappSyncDiagnosticsPage() {
  try {
    await requireWhatsappSyncDiagnosticsOperator(createSupabaseWriteClient());
  } catch {
    redirect("/dashboard");
  }

  redirect("/operations/diagnostics/whatsapp-sync");
}
