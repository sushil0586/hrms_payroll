"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function workspaceHrefFor(user: {
  workspace_access?: {
    platform_admin?: boolean;
    hr_admin?: boolean;
    tenant_admin?: boolean;
    mss?: boolean;
    ess?: boolean;
  };
}) {
  if (user.workspace_access?.platform_admin) return "/platform-admin";
  if (user.workspace_access?.hr_admin) return "/hr-admin";
  if (user.workspace_access?.tenant_admin) return "/tenant-admin";
  if (user.workspace_access?.mss) return "/mss/approvals";
  return "/ess";
}

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });
    } catch {
      setError("Unable to reach the authentication service.");
      setIsSubmitting(false);
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.detail || "Unable to sign in.");
      setIsSubmitting(false);
      return;
    }

    router.push(workspaceHrefFor(payload.user ?? {}));
    router.refresh();
  }

  return (
    <form className="form-shell-card auth-form-shell" onSubmit={handleSubmit}>
      <div className="form-shell-card__intro">
        <h2 className="section-heading-soft">Sign in</h2>
        <p className="section-copy section-copy-soft">Use the same account for platform, tenant, HR admin, manager, and employee workspaces.</p>
      </div>

      <div className="auth-role-strip" aria-label="Available workspaces after sign in">
        <span className="auth-role-chip">Platform Admin</span>
        <span className="auth-role-chip">HR Admin</span>
        <span className="auth-role-chip">Tenant Admin</span>
        <span className="auth-role-chip">Manager</span>
        <span className="auth-role-chip">Employee</span>
      </div>

      <label className="auth-field">
        <span className="muted">Username or email</span>
        <input
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="auth-input"
          placeholder="riya.sharma@northstar.example"
        />
      </label>

      <label className="auth-field">
        <span className="muted">Password</span>
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="auth-input"
          placeholder="Enter your password"
        />
      </label>

      {error ? <div className="notice"><span className="muted">{error}</span></div> : null}

      <div className="form-actions-bar auth-form-shell__actions">
        <span className="muted">Your role-specific workspace becomes available after sign-in.</span>
        <div className="form-actions-bar__buttons">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </form>
  );
}
