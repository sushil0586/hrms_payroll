import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceAccess({ workspace: "tenant_admin" });
  return children;
}
