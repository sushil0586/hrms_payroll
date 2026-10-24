import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { OrganizationAccessNotice } from "@/app/hr-admin/organization/organization-access-notice";
import { organizationReturnHref } from "@/app/hr-admin/organization/section-config";
import { notFound } from "next/navigation";

import { OrganizationForm } from "@/app/hr-admin/organization/organization-form";
import {
  isOrganizationSectionKey,
  organizationItemToFormValue,
  ORGANIZATION_SECTION_CONFIG,
} from "@/app/hr-admin/organization/section-config";
import { getHrAdminOrganizationFormOptions, getHrAdminOrganizationItem } from "@/lib/api";
import type { HrAdminOrganizationItem } from "@/lib/types";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{
    section: string;
    itemId: string;
  }>;
};

export default async function HrAdminEditOrganizationItemPage({ params, searchParams }: PageProps) {
  const { section, itemId } = await params;
  if (!isOrganizationSectionKey(section)) {
    notFound();
  }
  const user = await requireSessionPermission({
    permissionKeys: ["organization.manage"],
    fallbackPath: `/hr-admin/organization?section=${section}&itemId=${itemId}`,
  });
  if (!sessionHasPermission(user, "organization.view")) return <OrganizationAccessNotice />;
  const query = (await searchParams) ?? {};
  const returnHref = organizationReturnHref(typeof query.returnTo === "string" ? query.returnTo : undefined, section);


  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminOrganizationItem(section, itemId).catch(()=>null),
    getHrAdminOrganizationFormOptions().catch(()=>null),
  ]);

  const item = itemResult?.data as HrAdminOrganizationItem | undefined;
  if (itemResult?.state !== "live") return <OrganizationAccessNotice unavailable />;
  if (!item?.id || item.id !== itemId) {
    notFound();
  }

  if (optionsResult?.state !== "live") return <OrganizationAccessNotice unavailable />;
  const sectionMeta = ORGANIZATION_SECTION_CONFIG[section];

  return (
    <main className="shell accerio-page">
      <WorkspaceStandardHeader title={`Edit ${sectionMeta.singular.toLowerCase()}`} description="Maintain identity, mappings and active-state behavior." actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>Back to {sectionMeta.label.toLowerCase()}</a>} />

      <OrganizationForm returnHref={returnHref}
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
