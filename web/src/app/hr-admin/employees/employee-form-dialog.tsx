"use client";

import { useState } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { EmployeeForm, type EmployeeFormProps } from "./employee-form";

/** Keep the shared close/dirty guard aware of this form's actual request lifetime. */
export function EmployeeFormDialog({ closeHref, onClose, ...props }: EmployeeFormProps & { closeHref: string; onClose?: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <HrAdminActionModal
      busy={busy}
      documentNavigation={!onClose}
      closeHref={closeHref}
      onClose={onClose}
      description="Complete identity, contact, structure, and review before saving."
      eyebrow={props.mode === "edit" ? props.initialValue.employee_code : "Employee master"}
      labelledBy={`employee-${props.mode}-modal-title`}
      title={props.mode === "create" ? "Create employee" : "Edit employee"}
    >
      <EmployeeForm {...props} cancelHref={onClose ? undefined : closeHref} onCancel={onClose} onSubmittingChange={setBusy} />
    </HrAdminActionModal>
  );
}
