import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceAccess();
  return <div className="accerio-standalone">{children}</div>;
}
