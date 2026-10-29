import { PageIntro } from "@/components/patterns/page-intro";
import { getPlatformPermissionCatalog } from "@/lib/api";
import { PermissionCatalogWorkspace } from "./permission-catalog-workspace";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
function param(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function PlatformAdminPermissionsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { data: catalog } = await getPlatformPermissionCatalog();
  return <main className="shell accerio-page platform-permission-catalog">
    <PageIntro appearance="accerio" eyebrow="RBAC control" title="Permission Catalog"
      description="Platform-owned permission definitions used by tenant roles, default grants, and backend access checks."
      actions={<a className="button button--secondary" href="/platform-admin">Dashboard</a>}
      pills={["Immutable keys", "Tenant assignability", "Risk review"]} showPills />
    <PermissionCatalogWorkspace initialCatalog={catalog} initialFilters={{
      q: param(params.q) ?? "",
      assignable: param(params.assignable) ?? "all",
      risk: param(params.risk) ?? "all",
      module: param(params.module) ?? "all",
    }} />
  </main>;
}
