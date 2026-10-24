"use client";

import { useState, type ComponentProps } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { EmployeeAccessForm } from "./[employeeId]/access/access-form";
import { BankAccountManager } from "./[employeeId]/bank-accounts/bank-account-manager";

type Props = { closeHref: string; employeeCode: string; employeeName: string } & (
  { kind: "access"; form: ComponentProps<typeof EmployeeAccessForm> } |
  { kind: "bank"; form: ComponentProps<typeof BankAccountManager> }
);
export function EmployeeMaintenanceDialog(props: Props) {
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const callbacks = { cancelHref: props.closeHref, onBusyChange: setBusy, onDirtyChange: setDirty };
  return (
    <HrAdminActionModal busy={busy} dirty={dirty} documentNavigation className="employee-maintenance-phase4-modal"
      closeHref={props.closeHref} eyebrow={props.employeeCode} labelledBy={`employee-${props.kind}-modal-title`}
      title={props.kind === "access" ? "Manage access" : "Manage bank accounts"}
      description={`${props.employeeName} · ${props.kind === "access" ? "Review login, membership and tenant roles before saving." : "Review payout details and primary account changes before saving."}`}>
      {props.kind === "access" ? <EmployeeAccessForm {...props.form} {...callbacks} /> : <BankAccountManager {...props.form} {...callbacks} />}
    </HrAdminActionModal>
  );
}
