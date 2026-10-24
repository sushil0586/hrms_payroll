"use client";

import { useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { EmployeeForm, type EmployeeFormProps } from "./employee-form";

/** Keep the shared close/dirty guard aware of this form's actual request lifetime. */
export function EmployeeFormDialog({ closeHref, ...props }: EmployeeFormProps & { closeHref: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <HrAdminActionModal
      busy={busy}
      documentNavigation
      closeHref={closeHref}
      description="Complete identity, contact, structure, and review before saving."
      eyebrow={props.mode === "edit" ? props.initialValue.employee_code : "Employee master"}
      labelledBy={`employee-${props.mode}-modal-title`}
      title={props.mode === "create" ? "Create employee" : "Edit employee"}
    >
      <EmployeeForm {...props} cancelHref={closeHref} onSubmittingChange={setBusy} />
    </HrAdminActionModal>
  );
}
