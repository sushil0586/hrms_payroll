import { HrAdminChrome } from "@/components/shell/hr-admin-chrome";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function HrAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;

  return <HrAdminChrome userLabel={userLabel}>{children}</HrAdminChrome>;
}
