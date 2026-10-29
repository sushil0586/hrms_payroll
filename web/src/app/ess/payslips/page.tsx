import { unstable_rethrow } from "next/navigation";

import EssError from "@/app/ess/error";
import { getEssPayrollPayslips } from "@/lib/api";

import { PayslipsWorkspace, type PayslipQuery } from "./payslips-workspace";

type Value = string | string[] | undefined;

export default async function EssPayslipsPage({ searchParams }: { searchParams?: Promise<Record<string, Value>> }) {
  const params = (await searchParams) ?? {};
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const positive = (key: string, fallback: number) => { const value = Number(first(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const requestedSize = positive("page_size", 5);
  const query: PayslipQuery = { q: first("q") || "", year: /^[1-9]\d{3}$/.test(first("year") || "") ? first("year")! : "", page: positive("page", 1), page_size: [5, 10, 25, 50].includes(requestedSize) ? requestedSize : 5, payslipId: first("payslipId") || "" };
  let result: Awaited<ReturnType<typeof getEssPayrollPayslips>>;
  try {
    result = await getEssPayrollPayslips({ q: query.q, year: query.year, page: query.page, page_size: query.page_size, selected_id: query.payslipId }, 15_000);
    const last = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
    if (query.page > last) { query.page = last; result = await getEssPayrollPayslips({ q: query.q, year: query.year, page: query.page, page_size: query.page_size, selected_id: query.payslipId }, 15_000); }
    if (!result.data.items.some((item) => item.id === query.payslipId)) query.payslipId = "";
  } catch (error) {
    unstable_rethrow(error);
    return <EssError />;
  }
  return <PayslipsWorkspace initialData={result.data} initialQuery={query} />;
}
