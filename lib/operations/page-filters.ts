import type { OperationsFilters } from "@/lib/operations/command-center";

type SearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> | undefined;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function resolveOperationsFilters(searchParams: SearchParams): Promise<OperationsFilters> {
  const params = searchParams ? await searchParams : undefined;
  return {
    company: first(params?.company),
    period: first(params?.period),
    q: first(params?.q),
  };
}
