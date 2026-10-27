"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import type { EmployeeProfile } from "@/lib/types";

export function ProfileEditForm({ profile }: { profile: EmployeeProfile }) {
  const router = useRouter();
  const [value, setValue] = useState({ preferred_name: profile.preferred_name, personal_email: profile.personal_email, phone_number: profile.phone_number });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/ess/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload.detail || Object.values(payload)[0] || "Unable to update profile."));
      setMessage("Profile contact details updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update profile. Try again.");
    } finally { setPending(false); }
  }

  return <form className="form-layout-modern" aria-busy={pending} onSubmit={submit}>
    <div className="form-grid">
      <label className="form-field"><span>Preferred name</span><input className="input-control" value={value.preferred_name} onChange={(event) => setValue((current) => ({ ...current, preferred_name: event.target.value }))} /></label>
      <label className="form-field"><span>Personal email</span><input className="input-control" type="email" value={value.personal_email} onChange={(event) => setValue((current) => ({ ...current, personal_email: event.target.value }))} /></label>
      <label className="form-field"><span>Phone number</span><input className="input-control" value={value.phone_number} onChange={(event) => setValue((current) => ({ ...current, phone_number: event.target.value }))} /></label>
    </div>
    {error ? <div className="notice notice--error" role="alert">{error}</div> : null}
    {message ? <div className="notice notice--success" role="status">{message}</div> : null}
    <AsyncActionButton className="button button--primary" pending={pending} pendingLabel="Saving profile" type="submit">Save profile</AsyncActionButton>
  </form>;
}
