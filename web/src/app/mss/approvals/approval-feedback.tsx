"use client";

import { useMemo } from "react";
import { useActionFeedback } from "@/components/patterns/action-feedback-provider";

/** Approval wording stays domain-owned; lifetime is owned by the authenticated layout. */
export function useApprovalSuccess() {
  const feedback = useActionFeedback();
  return useMemo(() => feedback ? (message: string) => feedback.success("Action saved.", message) : null, [feedback]);
}
