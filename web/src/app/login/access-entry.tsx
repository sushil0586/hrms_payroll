"use client";

import { useState } from "react";

import { LoginForm } from "@/app/login/login-form";
import { PublicLeadForm } from "@/app/public-lead-form";

type AccessMode = "signin" | "request";

type AccessEntryProps = {
  demoModeWithoutBackend?: boolean;
  initialMode?: AccessMode;
};

export function AccessEntry({ demoModeWithoutBackend = false, initialMode = "signin" }: AccessEntryProps) {
  const [mode, setMode] = useState<AccessMode>(initialMode);

  function selectMode(nextMode: AccessMode) {
    setMode(nextMode);
    window.history.replaceState(null, "", nextMode === "request" ? "?mode=request" : window.location.pathname);
  }

  function handleTabKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === "ArrowLeft" || event.key === "Home" ? "signin" : "request";
    selectMode(nextMode);
    document.getElementById(`${nextMode}-tab`)?.focus();
  }

  return (
    <div className="auth-panel public-access-card">
      <h2>Welcome to Accerio</h2>
      <p className="public-access-card__intro">Sign in to an existing account or request a guided workspace for your organization.</p>
      <div className="public-access-tabs" role="tablist" aria-label="Access options" onKeyDown={handleTabKey}>
        <button
          aria-controls="signin-panel"
          aria-selected={mode === "signin"}
          className={mode === "signin" ? "is-active" : ""}
          id="signin-tab"
          onClick={() => selectMode("signin")}
          role="tab"
          tabIndex={mode === "signin" ? 0 : -1}
          type="button"
        >
          Sign in
        </button>
        <button
          aria-controls="request-panel"
          aria-selected={mode === "request"}
          className={mode === "request" ? "is-active" : ""}
          id="request-tab"
          onClick={() => selectMode("request")}
          role="tab"
          tabIndex={mode === "request" ? 0 : -1}
          type="button"
        >
          Request access
        </button>
      </div>
      <div aria-labelledby="signin-tab" hidden={mode !== "signin"} id="signin-panel" role="tabpanel">
        <LoginForm demoModeWithoutBackend={demoModeWithoutBackend} />
      </div>
      <div aria-labelledby="request-tab" hidden={mode !== "request"} id="request-panel" role="tabpanel">
        <div className="public-access-request-note">
          <strong>Guided access, reviewed before setup</strong>
          <span>Your request does not create a tenant or activate payroll immediately.</span>
        </div>
        <PublicLeadForm intent="signup" minimal submitLabel="Request guided access" />
      </div>
    </div>
  );
}
