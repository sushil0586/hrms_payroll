"use client";

import { useCallback, useRef, useState } from "react";

export class ScopedMutationError extends Error {
  ambiguous: boolean;
  status?: number;

  constructor(message: string, options?: { ambiguous?: boolean; status?: number }) {
    super(message);
    this.name = "ScopedMutationError";
    this.ambiguous = Boolean(options?.ambiguous);
    this.status = options?.status;
  }
}

export type ScopedMutationReceipt<Result> = {
  result: Result;
  affectedResources: string[];
};

type Options<Arguments, Result> = {
  mutate: (args: Arguments) => Promise<ScopedMutationReceipt<Result>>;
  onConfirmed: (receipt: ScopedMutationReceipt<Result>, args: Arguments) => void | Promise<void>;
  fallbackError: string;
  onUnauthorized?: () => void;
};

/** Prevents duplicate submits and reconciles only named resources after confirmation. */
export function useScopedWorkspaceMutation<Arguments, Result>({
  mutate,
  onConfirmed,
  fallbackError,
  onUnauthorized,
}: Options<Arguments, Result>) {
  const inFlight = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [ambiguous, setAmbiguous] = useState(false);

  const run = useCallback(async (args: Arguments) => {
    if (inFlight.current) return { ok: false as const, duplicate: true as const };
    inFlight.current = true;
    setIsPending(true);
    setError("");
    setAmbiguous(false);
    try {
      const receipt = await mutate(args);
      await onConfirmed(receipt, args);
      return { ok: true as const, receipt };
    } catch (caught) {
      const mutationError = caught instanceof ScopedMutationError ? caught : null;
      if (mutationError?.status === 401) onUnauthorized?.();
      const message = caught instanceof Error && caught.message ? caught.message : fallbackError;
      setError(message);
      setAmbiguous(Boolean(mutationError?.ambiguous));
      return { ok: false as const, duplicate: false as const, error: message, ambiguous: Boolean(mutationError?.ambiguous) };
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  }, [fallbackError, mutate, onConfirmed, onUnauthorized]);

  const reset = useCallback(() => {
    setError("");
    setAmbiguous(false);
  }, []);

  return { run, reset, isPending, error, ambiguous };
}
