import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OperationsCompanyDetailPage } from "@/components/operations/operations-command-center";
import { assertCommandCenterRoute } from "@/lib/features/route-guards";
import { getOperationsSnapshot } from "@/lib/operations/command-center";
import { resolveOperationsFilters } from "@/lib/operations/page-filters";

export const metadata = { title: "Empresa — Centro de Comando" };
export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const context = await assertCommandCenterRoute();
  const snapshot = await getOperationsSnapshot(context, { ...(await resolveOperationsFilters(searchParams)), company: slug });
  const company = snapshot.companies.find((item) => item.slug === slug);

  if (!company) notFound();

  return (
    <AppShell active="operations">
      <OperationsCompanyDetailPage snapshot={snapshot} company={company} />
    </AppShell>
  );
}
