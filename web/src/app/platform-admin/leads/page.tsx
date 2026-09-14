import { renderPlatformAdminConsole, type SearchParamValue } from "../platform-admin-renderer";
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminLeadsPage({ searchParams }: PageProps) {
  return renderPlatformAdminConsole("leads", (await searchParams) ?? {});
}
