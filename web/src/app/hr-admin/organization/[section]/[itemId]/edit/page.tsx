import Link from "next/link";
import { notFound } from "next/navigation";

import { OrganizationForm } from "@/app/hr-admin/organization/organization-form";
import {
  isOrganizationSectionKey,
  organizationItemToFormValue,
  ORGANIZATION_SECTION_CONFIG,
} from "@/app/hr-admin/organization/section-config";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminOrganizationFormOptions, getHrAdminOrganizationItem } from "@/lib/api";
import type { HrAdminOrganizationItem } from "@/lib/types";

type PageProps = {
  params: Promise<{
    section: string;
    itemId: string;
  }>;
};

export default async function HrAdminEditOrganizationItemPage({ params }: PageProps) {
  const { section, itemId } = await params;
  if (!isOrganizationSectionKey(section)) {
    notFound();
  }

  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminOrganizationItem(section, itemId),
    getHrAdminOrganizationFormOptions(),
  ]);

  const item = itemResult.data as HrAdminOrganizationItem | undefined;
  if (!item?.id) {
    notFound();
  }

  const sectionMeta = ORGANIZATION_SECTION_CONFIG[section];
  const state = itemResult.state === "live" && optionsResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live edit mode" : "Demo edit mode"}
        title={`Edit ${sectionMeta.singular.toLowerCase()}`}
        description="Update the structural record without breaking employee mappings or policy dependencies."
        actions={<Link className="button button--secondary" href={`/hr-admin/organization?section=${section}`}>Back to {sectionMeta.label.toLowerCase()}</Link>}
        pills={["Structure maintenance", "Dependency-safe edits", "Catalog-linked workflow"]}
      />

      <OrganizationForm
        currentItem={item}
        initialValue={organizationItemToFormValue(item)}
        itemId={item.id}
        mode="edit"
        options={optionsResult.data}
        section={section}
      />
    </main>
  );
}
