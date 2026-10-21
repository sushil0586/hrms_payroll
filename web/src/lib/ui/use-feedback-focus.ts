"use client";

import { useEffect, useRef } from "react";

/** A disabled submit button can lose focus. Keep failed actions inside their dialog. */
export function useFeedbackFocus(message: string, pending: boolean, hasFieldError = false) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef({ message: "", pending: false });
  useEffect(() => {
    const newFailure = message && (message !== previous.current.message || (previous.current.pending && !pending));
    previous.current = { message, pending };
    // Clearing inline validation while typing is not a new failed submission.
    if (newFailure && !pending && !hasFieldError) ref.current?.focus();
  }, [message, pending, hasFieldError]);
  return ref;
}
