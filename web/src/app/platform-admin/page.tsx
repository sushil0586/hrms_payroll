import { renderPlatformAdminConsole, resolvePanel, type SearchParamValue } from "./platform-admin-renderer";

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  return renderPlatformAdminConsole(resolvePanel(currentParams), currentParams);
}
