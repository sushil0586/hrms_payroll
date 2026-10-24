"use client";

import { createContext, useContext, useState, type ComponentProps } from "react";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";

const SetupState = createContext<{ setBusy: (value: boolean) => void; setDirty: (value: boolean) => void } | null>(null);
export function useDocumentSetupState() { return useContext(SetupState); }
export function DocumentSetupDialog(props: ComponentProps<typeof HrAdminActionModal>) {
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  return <SetupState.Provider value={{ setBusy, setDirty }}><HrAdminActionModal {...props} className={`document-setup-dialog document-operations ${props.className ?? ""}`} busy={busy} dirty={dirty} onClose={() => {
    window.dispatchEvent(new Event("document-setup:leaving"));
    window.location.assign(new URL(props.closeHref, window.location.origin));
  }} /></SetupState.Provider>;
}
