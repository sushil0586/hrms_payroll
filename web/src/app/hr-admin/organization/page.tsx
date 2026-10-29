import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { getHrAdminOrganizationFormOptions, getHrAdminOrganizationSnapshot } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { OrganizationAccessNotice } from "./organization-access-notice";
import { OrganizationCatalogWorkspace } from "./organization-catalog-workspace";
import { isOrganizationSectionKey, type OrganizationSectionKey } from "./section-config";

type SearchParamValue = string | string[] | undefined;
type PageProps = { searchParams?: Promise<Record<string, SearchParamValue>> };

function param(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminOrganizationPage({ searchParams }: PageProps) {
  const user = await requireSessionPermission({
    permissionKeys: ["organization.view", "organization.manage"],
    fallbackPath: "/access-denied",
  });
  if (!sessionHasPermission(user, "organization.view")) return <OrganizationAccessNotice />;

  const [snapshot, options] = await Promise.all([
    getHrAdminOrganizationSnapshot().catch(() => null),
    getHrAdminOrganizationFormOptions().catch(() => null),
  ]);
  if (snapshot?.state !== "live" || options?.state !== "live") {
    return <OrganizationAccessNotice unavailable />;
  }

  const params = (await searchParams) ?? {};
  const rawSection = param(params.section) ?? "departments";
  const section: OrganizationSectionKey = isOrganizationSectionKey(rawSection) ? rawSection : "departments";
  const rawStatus = param(params.status);
  const status = rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "all";
  const rawPage = Number(param(params.page));
  const rawPageSize = Number(param(params.page_size));
  const editId = param(params.editOrganization) ?? "";
  const create = param(params.organizationModal) === "create";

  return (
    <main className="shell accerio-page organization-makeover">
      <WorkspaceStandardHeader
        title="Organization masters"
        description="Maintain the structure used by employee records and HR policies. Filters, selection, and edits update within this workspace."
        actions={sessionHasPermission(user, "employees.view") ? <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/employees">Employees</a> : null}
      />
      <OrganizationCatalogWorkspace
        initialData={{ snapshot: snapshot.data, options: options.data }}
        initialQuery={{
          section,
          q: param(params.q) ?? "",
          status,
          page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
          page_size: [10, 25, 50].includes(rawPageSize) ? rawPageSize : 10,
        }}
        initialSelectedId={param(params.itemId) ?? ""}
        initialModal={editId ? { mode: "edit", id: editId } : create ? { mode: "create", id: "" } : { mode: "", id: "" }}
        canManage={sessionHasPermission(user, "organization.manage")}
      />
    </main>
  );
}
