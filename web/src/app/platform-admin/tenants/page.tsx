import { renderPlatformAdminConsole, type SearchParamValue } from "../platform-admin-renderer";
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminTenantsPage({ searchParams }: PageProps) {
  return renderPlatformAdminConsole("tenants", (await searchParams) ?? {});
}
