import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { OrganizationAccessNotice } from "@/app/hr-admin/organization/organization-access-notice";
import { organizationReturnHref } from "@/app/hr-admin/organization/section-config";
import { notFound } from "next/navigation";

import { OrganizationForm } from "@/app/hr-admin/organization/organization-form";
import {
  createEmptyOrganizationFormValue,
  isOrganizationSectionKey,
  ORGANIZATION_SECTION_CONFIG,
} from "@/app/hr-admin/organization/section-config";
import { getHrAdminOrganizationFormOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{
    section: string;
  }>;
};

export default async function HrAdminNewOrganizationItemPage({ params, searchParams }: PageProps) {
  const { section } = await params;
  if (!isOrganizationSectionKey(section)) {
    notFound();
  }
  const user = await requireSessionPermission({
    permissionKeys: ["organization.manage"],
    fallbackPath: `/hr-admin/organization?section=${section}`,
  });
  if (!sessionHasPermission(user, "organization.view")) return <OrganizationAccessNotice />;
  const query = (await searchParams) ?? {};
  const returnHref = organizationReturnHref(typeof query.returnTo === "string" ? query.returnTo : undefined, section);


  const optionsResult = await getHrAdminOrganizationFormOptions().catch(()=>null);
  if (optionsResult?.state !== "live") return <OrganizationAccessNotice unavailable />;
  const sectionMeta = ORGANIZATION_SECTION_CONFIG[section];

  return (
    <main className="shell accerio-page">
      <WorkspaceStandardHeader title={`Create ${sectionMeta.singular.toLowerCase()}`} description="Maintain identity, mappings and active-state behavior." actions={<a data-navigation-mode="document" className="button button--secondary" href={returnHref}>Back to {sectionMeta.label.toLowerCase()}</a>} />

      <OrganizationForm returnHref={returnHref} initialValue={createEmptyOrganizationFormValue(section)} mode="create" options={optionsResult.data} section={section} />
    </main>
  );
}
