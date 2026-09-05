import Link from "next/link";

import { notificationTemplateToFormValue } from "@/app/hr-admin/notification-templates/form-values";
import { NotificationTemplateForm } from "@/app/hr-admin/notification-templates/notification-template-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationOptions, getHrAdminNotificationTemplate } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditNotificationTemplatePage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminNotificationTemplate(itemId),
    getHrAdminNotificationOptions(),
  ]);
  const state = itemResult.state === "live" && optionsResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live notification mode" : "Demo notification mode"}
        title="Edit notification template"
        description="Update template content and channel configuration without dropping back to the older admin visual style."
        actions={<Link className="button button--secondary" href="/hr-admin/notification-templates">Back to templates</Link>}
        pills={["Content refinement", "Channel configuration", "Metadata updates"]}
      />
      <NotificationTemplateForm
        initialValue={notificationTemplateToFormValue(itemResult.data)}
        mode="edit"
        options={optionsResult.data}
        itemId={itemId}
      />
    </main>
  );
}
