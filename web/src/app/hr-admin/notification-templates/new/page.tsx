import Link from "next/link";

import { createEmptyNotificationTemplateValue } from "@/app/hr-admin/notification-templates/form-values";
import { NotificationTemplateForm } from "@/app/hr-admin/notification-templates/notification-template-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationOptions } from "@/lib/api";

export default async function HrAdminNewNotificationTemplatePage() {
  const optionsResult = await getHrAdminNotificationOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live notification mode" : "Demo notification mode"}
        title="Create notification template"
        description="Define reusable content for a notification channel using the same centralized, modern form language as the rest of the app."
        actions={<Link className="button button--secondary" href="/hr-admin/notification-templates">Back to templates</Link>}
        pills={["Reusable message content", "Metadata-aware templates", "Channel-specific setup"]}
      />
      <NotificationTemplateForm
        initialValue={createEmptyNotificationTemplateValue(
          optionsResult.data.notification_channels[0]?.value,
          optionsResult.data.notification_template_statuses[0]?.value,
        )}
        mode="create"
        options={optionsResult.data}
      />
    </main>
  );
}
