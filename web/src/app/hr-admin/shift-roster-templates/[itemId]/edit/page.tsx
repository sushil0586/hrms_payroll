import Link from "next/link";

import { shiftRosterTemplateToFormValue } from "@/app/hr-admin/shift-roster-templates/form-values";
import { ShiftRosterTemplateForm } from "@/app/hr-admin/shift-roster-templates/shift-roster-template-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions, getHrAdminShiftRosterTemplate } from "@/lib/api";
import { requireSessionPermission } from "@/lib/workspace-access";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function HrAdminEditShiftRosterTemplatePage({ params }: PageProps) {
  await requireSessionPermission({ permissionKeys: ["attendance.policies.manage"], fallbackPath: "/hr-admin/shift-roster-templates" });
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminShiftRosterTemplate(itemId),
    getHrAdminPolicyOptions(),
  ]);

  return (
    <main className="shell">
      <PageIntro
        eyebrow={itemResult.state === "live" ? "Live roster template mode" : "Demo roster template mode"}
        title="Edit roster template."
        description="Adjust the reusable shift pattern, publication state, and rollout behavior before operations stamp it across employees."
        actions={<Link className="button button--secondary" href="/hr-admin/shift-roster-templates">Back to roster templates</Link>}
      />
      <ShiftRosterTemplateForm initialValue={shiftRosterTemplateToFormValue(itemResult.data)} itemId={itemId} mode="edit" options={optionsResult.data} />
    </main>
  );
}
