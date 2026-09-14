import { renderPlatformAdminConsole, type SearchParamValue } from "../platform-admin-renderer";
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminAuditLogsPage({ searchParams }: PageProps) {
  return renderPlatformAdminConsole("events", (await searchParams) ?? {});
}
