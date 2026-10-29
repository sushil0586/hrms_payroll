import { Suspense } from "react";

import { PublicAuthFrame } from "@/app/components/public-auth-frame";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <PublicAuthFrame eyebrow="Secure account recovery" title="Set your password, then return to work." description="Your password protects one tenant-scoped identity across every workspace assigned by your organization.">
      <div className="auth-panel public-access-card public-access-card--recovery">
        <Suspense fallback={<div className="form-shell-card auth-form-shell"><p className="section-copy">Loading secure setup link...</p></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </PublicAuthFrame>
  );
}
