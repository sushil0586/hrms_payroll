"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { hasFieldErrors, requireText, type FieldErrors } from "@/lib/ui/validation";
import { getPrimaryWorkspaceHref } from "@/lib/workspace-routing";

type LoginField = "identifier" | "password";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFieldErrors: FieldErrors<LoginField> = {
      identifier: requireText(identifier, "Enter your username or email."),
      password: requireText(password, "Enter your password."),
    };
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setError("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

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

    const workspaceHref = getPrimaryWorkspaceHref(payload.user ?? {});
    if (!workspaceHref) {
      router.push("/workspace-access");
      router.refresh();
      return;
    }

    router.push(workspaceHref);
    router.refresh();
  }

  return (
    <form className="form-shell-card auth-form-shell" noValidate onSubmit={handleSubmit}>
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
          aria-invalid={Boolean(fieldErrors.identifier)}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setFieldErrors((current) => ({ ...current, identifier: undefined }));
          }}
          className="auth-input"
          placeholder="riya.sharma@northstar.example"
        />
        {fieldErrors.identifier ? <span className="field-error-text" role="alert">{fieldErrors.identifier}</span> : null}
      </label>

      <label className="auth-field">
        <span className="muted">Password</span>
        <input
          required
          type="password"
          value={password}
          aria-invalid={Boolean(fieldErrors.password)}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          className="auth-input"
          placeholder="Enter your password"
        />
        {fieldErrors.password ? <span className="field-error-text" role="alert">{fieldErrors.password}</span> : null}
      </label>

      {error ? <div className="notice notice--error" role="alert"><span className="muted">{error}</span></div> : null}

      <div className="form-actions-bar auth-form-shell__actions">
        <Link className="auth-recovery-link" href="/forgot-password">
          Forgot password?
        </Link>
        <div className="form-actions-bar__buttons">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </form>
  );
}
