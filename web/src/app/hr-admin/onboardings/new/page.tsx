import Link from "next/link";
import { createEmptyOnboardingValue } from "@/app/hr-admin/onboardings/form-values";
import { OnboardingForm } from "@/app/hr-admin/onboardings/onboarding-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

export default async function HrAdminNewOnboardingPage() {
  const [optionsResult, templatesResult] = await Promise.all([getHrAdminLifecycleOptions(), getHrAdminWorkflowTemplates()]);
  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Create onboarding"
        description="Start the joiner workflow with shared owners, checklist logic, and queue-ready structure."
        actions={<Link className="button button--secondary" href="/hr-admin/onboardings">Back to onboardings</Link>}
        pills={["Checklist-aware completion", "Shared lifecycle ownership", "Queue-ready structure"]}
      />
      <OnboardingForm
        initialValue={createEmptyOnboardingValue(optionsResult.data.onboarding_statuses[0]?.value)}
        lifecycleTemplates={templatesResult.data}
        mode="create"
        options={optionsResult.data}
      />
    </main>
  );
}
