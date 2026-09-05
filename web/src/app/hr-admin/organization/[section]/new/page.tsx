import Link from "next/link";
import { notFound } from "next/navigation";

import { OrganizationForm } from "@/app/hr-admin/organization/organization-form";
import {
  createEmptyOrganizationFormValue,
  isOrganizationSectionKey,
  ORGANIZATION_SECTION_CONFIG,
} from "@/app/hr-admin/organization/section-config";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminOrganizationFormOptions } from "@/lib/api";

type PageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function HrAdminNewOrganizationItemPage({ params }: PageProps) {
  const { section } = await params;
  if (!isOrganizationSectionKey(section)) {
    notFound();
  }

  const optionsResult = await getHrAdminOrganizationFormOptions();
  const sectionMeta = ORGANIZATION_SECTION_CONFIG[section];

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live create mode" : "Demo create mode"}
        title={`Create ${sectionMeta.singular.toLowerCase()}`}
        description="Add structural master data carefully so downstream assignments, policies, and payroll mapping stay consistent."
        actions={<Link className="button button--secondary" href={`/hr-admin/organization?section=${section}`}>Back to {sectionMeta.label.toLowerCase()}</Link>}
        pills={["Shared structure catalog", "Downstream-safe mapping", "Modern form system"]}
      />

      <OrganizationForm initialValue={createEmptyOrganizationFormValue(section)} mode="create" options={optionsResult.data} section={section} />
    </main>
  );
}
