import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
export function OrganizationAccessNotice({ unavailable = false }: { unavailable?: boolean }) {
  return <main className="shell accerio-page"><WorkspaceStandardHeader title={unavailable ? "Organization data unavailable" : "Organization access unavailable"} description={unavailable ? "The required organization read could not be confirmed. Reload before making changes." : "Organization pages require organization.view as well as the permission for the action."} actions={<a data-navigation-mode="document" className="button button--secondary" href="/hr-admin">Back to HR Admin</a>} /></main>;
}
