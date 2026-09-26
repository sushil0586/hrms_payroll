import { Suspense } from "react";

import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="login-page auth-page">
      <section className="auth-panel">
        <div className="auth-panel__brand">
          <span className="workspace-logo">HR</span>
          <div>
            <p className="workspace-card__eyebrow">Account Recovery</p>
            <h1>Accerio HRMS</h1>
            <p className="section-copy">Set a secure password for your workspace access.</p>
          </div>
        </div>
        <Suspense fallback={<div className="form-shell-card auth-form-shell"><p className="section-copy">Loading secure setup link...</p></div>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
