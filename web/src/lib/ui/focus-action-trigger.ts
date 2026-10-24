import type { MouseEvent } from "react";

/** Capture the actual pointer trigger before opening a dialog, including WebKit. */
export function focusActionTrigger(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.focus({ preventScroll: true });
}
