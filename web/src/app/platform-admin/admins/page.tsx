import { renderPlatformAdminConsole, type SearchParamValue } from "../platform-admin-renderer";
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function PlatformAdminAdminsPage({ searchParams }: PageProps) {
  return renderPlatformAdminConsole("admins", (await searchParams) ?? {});
}
