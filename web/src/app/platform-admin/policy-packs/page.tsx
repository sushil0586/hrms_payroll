import { renderPlatformAdminConsole, type SearchParamValue } from "../platform-admin-renderer";
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminPolicyPacksPage({ searchParams }: PageProps) {
  return renderPlatformAdminConsole("policy-packs", (await searchParams) ?? {});
}
