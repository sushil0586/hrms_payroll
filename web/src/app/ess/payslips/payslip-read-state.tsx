"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { EssPayrollPayslip } from "@/lib/types";

const ReceiptContext = createContext<{ records: Record<string, EssPayrollPayslip>; save: (record: EssPayrollPayslip) => void } | null>(null);

export function PayslipReadStateProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, EssPayrollPayslip>>({});
  const save = useCallback((record: EssPayrollPayslip) => setRecords(current => ({ ...current, [record.id]: record })), []);
  return <ReceiptContext.Provider value={{ records, save }}>{children}</ReceiptContext.Provider>;
}

export function useConfirmedPayslip(initial: EssPayrollPayslip) {
  return useContext(ReceiptContext)?.records[initial.id] ?? initial;
}

export function useSavePayslipReceipt() {
  return useContext(ReceiptContext)?.save;
}

export function PayslipReadStatus({ payslip }: { payslip: EssPayrollPayslip }) {
  const current = useConfirmedPayslip(payslip);
  return <>
    <strong>{current.access_summary.is_read_acknowledged ? "Read" : "Unread"}</strong>
    <span className="workspace-table__secondary">{current.access_summary.download_count} downloads</span>
    <span className="workspace-table__secondary">{current.access_summary.notification_count} notifications</span>
  </>;
}
