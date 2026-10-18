"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AsyncActionButton } from "@/components/patterns/async-action-button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (isPending) return;
    setIsPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Try again.");
      router.push("/login");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign out. Try again.");
      setIsPending(false);
    }
  }

  return (
    <span>
      <AsyncActionButton className="button button--secondary" onClick={handleLogout} pending={isPending} pendingLabel="Signing out" type="button">
        Sign out
      </AsyncActionButton>
      {error ? <span className="field-help-text field-help-text--warning" role="alert">{error}</span> : null}
    </span>
  );
}
