import { assertPlatformAdminRoute } from "@/lib/features/route-guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertPlatformAdminRoute();
  return children;
}
