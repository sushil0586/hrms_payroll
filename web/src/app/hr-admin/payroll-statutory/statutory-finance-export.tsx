"use client";

import type { HrAdminEmployeeStatutoryDeclaration } from "@/lib/types";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function StatutoryFinanceExport({ declarations }: { declarations: HrAdminEmployeeStatutoryDeclaration[] }) {
  function download() {
    const rows = [
      ["declaration_reference", "financial_year", "tax_regime", "declared_total", "verified_total", "proof_count", "verified_proof_count", "locked_at", "source_hash"],
      ...declarations.map((item) => [
        `Declaration ${item.source_hash.slice(0, 12)}`,
        item.financial_year_code,
        item.tax_regime_label,
        item.declared_total_amount,
        item.verified_total_amount,
        item.item_count,
        item.verified_item_count,
        item.locked_at ?? "",
        item.source_hash,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statutory-locked-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <button className="button button--secondary" disabled={declarations.length === 0} type="button" onClick={download}>Export locked reconciliation</button>;
}
