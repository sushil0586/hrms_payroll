import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="login-page auth-page">
      <section className="auth-panel">
        <div className="auth-panel__brand">
          <span className="workspace-logo">HR</span>
          <div>
            <p className="workspace-card__eyebrow">Account Recovery</p>
            <h1>Accerio HRMS</h1>
            <p className="section-copy">Secure account setup and password recovery for every workspace.</p>
          </div>
        </div>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
