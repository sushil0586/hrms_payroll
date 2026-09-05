import Link from "next/link";
import { onboardingToFormValue } from "@/app/hr-admin/onboardings/form-values";
import { OnboardingForm } from "@/app/hr-admin/onboardings/onboarding-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminOnboarding, getHrAdminWorkflowTemplates } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };
export default async function HrAdminEditOnboardingPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult, templatesResult] = await Promise.all([
    getHrAdminOnboarding(itemId),
    getHrAdminLifecycleOptions(),
    getHrAdminWorkflowTemplates(),
  ]);
  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Edit onboarding"
        description="Refine timing, checklist context, and workflow routing without losing queue alignment."
        actions={<Link className="button button--secondary" href="/hr-admin/onboardings">Back to onboardings</Link>}
        pills={["Queue-linked readiness", "Shared owner contract", "Checklist-based completion rules"]}
      />
      <OnboardingForm
        initialValue={onboardingToFormValue(itemResult.data)}
        item={itemResult.data}
        itemId={itemId}
        lifecycleTemplates={templatesResult.data}
        mode="edit"
        options={optionsResult.data}
      />
    </main>
  );
}
