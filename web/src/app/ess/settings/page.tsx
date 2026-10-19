import { getEssProfile } from "@/lib/api";
import {
  WorkspaceStandardHeader,
  WorkspaceStandardPanel,
} from "@/components/patterns/workspace-standard";
import {
  WorkspaceInformation,
  WorkspaceQuickActions,
} from "@/components/patterns/workspace-information";
export default async function SettingsPage() {
  const { data: profile } = await getEssProfile();
  return (
    <main className="shell shell--workspace ess-compact">
      <WorkspaceStandardHeader
        eyebrow="Employee account"
        title="Settings"
        description="Your account context and supported employee services."
      />
      <WorkspaceStandardPanel title="Account">
        <WorkspaceInformation
          fields={[
            ["Employee", profile.full_name],
            ["Employee code", profile.employee_code],
            ["Work email", profile.work_email],
          ]}
        />
        <WorkspaceQuickActions
          actions={[
            {
              href: "/ess/profile",
              label: "My Profile",
              detail: "Review your employee information and field access.",
            },
            {
              href: "/ess/notifications",
              label: "Notification inbox",
              detail: "Review messages and update read state.",
            },
            {
              href: "/ess/requests",
              label: "My Requests",
              detail: "Track Leave and attendance requests.",
            },
            {
              href: "/forgot-password",
              label: "Password recovery",
              detail:
                "Request a secure recovery link. Delivery depends on your organization’s email service.",
            },
          ]}
        />
      </WorkspaceStandardPanel>
      <WorkspaceStandardPanel
        title="Preferences and security"
        description="Notification subscriptions, channel preferences, direct password changes and session administration are currently unavailable here. Contact your administrator for account changes. Roles, permissions and payroll settings are managed by authorized administrators."
      >
        <p>
          Sign out is available from the workspace account controls. Inbox read
          state does not change email, SMS or push delivery preferences.
        </p>
      </WorkspaceStandardPanel>
    </main>
  );
}
