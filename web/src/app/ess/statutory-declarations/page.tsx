import { getEssStatutoryDeclarations } from "@/lib/api";

import { StatutoryDeclarationWorkspace } from "./statutory-declaration-workspace";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EssStatutoryDeclarationsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const financialYear = normalizeParam(currentParams.financial_year) ?? "";
  const page = Number(normalizeParam(currentParams.page) ?? 1);
  const pageSize = Number(normalizeParam(currentParams.page_size) ?? 10);
  const selectedDeclarationId = normalizeParam(currentParams.declarationId);
  const result = await getEssStatutoryDeclarations({
    q,
    status,
    financial_year: financialYear,
    page,
    page_size: pageSize,
  });

  return (
    <StatutoryDeclarationWorkspace
      data={result.data}
      filters={{ financial_year: financialYear, page, page_size: pageSize, q, status }}
      isDemo={result.state !== "live"}
      selectedDeclarationId={selectedDeclarationId}
    />
  );
}
