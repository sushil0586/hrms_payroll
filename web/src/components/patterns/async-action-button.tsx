"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  pending?: boolean;
  pendingLabel: string;
};

export function AsyncActionButton({
  children,
  className = "",
  disabled,
  pending = false,
  pendingLabel,
  ...props
}: Props) {
  return (
    <button
      {...props}
      aria-label={pending ? pendingLabel : props["aria-label"]}
      aria-busy={pending || undefined}
      className={`${className}${className ? " " : ""}async-action-button`}
      disabled={disabled || pending}
    >
      <span className="async-action-button__content" aria-hidden={pending ? "true" : undefined}>
        {pending ? <span className="async-action-button__spinner" aria-hidden="true" /> : null}
        <span>{pending ? pendingLabel : children}</span>
      </span>
      {pending ? <span className="sr-only" role="status" aria-live="polite">{pendingLabel}</span> : null}
    </button>
  );
}
