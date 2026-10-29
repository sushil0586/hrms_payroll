import { PublicAuthFrame } from "@/app/components/public-auth-frame";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <PublicAuthFrame eyebrow="Secure account recovery" title="Return to your assigned workspace securely." description="Password recovery uses the same tenant-scoped identity and preserves your assigned roles and workspace access.">
      <div className="auth-panel public-access-card public-access-card--recovery">
        <ForgotPasswordForm />
      </div>
    </PublicAuthFrame>
  );
}
