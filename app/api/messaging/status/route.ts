import { NextResponse } from "next/server";
import { getActiveMessagingProviderKey, getMessagingProvider, getMessagingProvidersStatus } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activeProviderKey = getActiveMessagingProviderKey();
    const activeProvider = getMessagingProvider(activeProviderKey);
    const [activeStatus, providers] = await Promise.all([
      activeProvider.getStatus(),
      getMessagingProvidersStatus(),
    ]);

    return NextResponse.json({
      ok: true,
      activeProvider: activeProviderKey,
      activeStatus,
      providers,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to load messaging status",
    }, { status: 500 });
  }
}
