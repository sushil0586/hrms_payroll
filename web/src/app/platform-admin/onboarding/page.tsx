import { renderPlatformAdminConsole, type SearchParamValue } from "../platform-admin-renderer";
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminOnboardingPage({ searchParams }: PageProps) {
  return renderPlatformAdminConsole("onboarding", (await searchParams) ?? {});
}
