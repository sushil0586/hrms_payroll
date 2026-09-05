import Link from "next/link";

import { createEmptyShiftRosterTemplateValue } from "@/app/hr-admin/shift-roster-templates/form-values";
import { ShiftRosterTemplateForm } from "@/app/hr-admin/shift-roster-templates/shift-roster-template-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPolicyOptions } from "@/lib/api";

export default async function HrAdminNewShiftRosterTemplatePage() {
  const optionsResult = await getHrAdminPolicyOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live roster template mode" : "Demo roster template mode"}
        title="Create roster template."
        description="Build a repeatable shift pattern that can be previewed and rolled out at employee scope later."
        actions={<Link className="button button--secondary" href="/hr-admin/shift-roster-templates">Back to roster templates</Link>}
      />
      <ShiftRosterTemplateForm initialValue={createEmptyShiftRosterTemplateValue()} mode="create" options={optionsResult.data} />
    </main>
  );
}
