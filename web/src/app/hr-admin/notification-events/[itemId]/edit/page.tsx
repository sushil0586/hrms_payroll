import Link from "next/link";

import { notificationEventToFormValue } from "@/app/hr-admin/notification-events/form-values";
import { NotificationEventForm } from "@/app/hr-admin/notification-events/notification-event-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationEvent, getHrAdminNotificationOptions } from "@/lib/api";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function HrAdminEditNotificationEventPage({ params }: PageProps) {
  const { itemId } = await params;
  const [itemResult, optionsResult] = await Promise.all([
    getHrAdminNotificationEvent(itemId),
    getHrAdminNotificationOptions(),
  ]);
  const state = itemResult.state === "live" && optionsResult.state === "live" ? "live" : "demo";

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live notification mode" : "Demo notification mode"}
        title="Edit notification event"
        description="Update routing, audience, and template selection for this trigger without leaving the shared admin workflow language."
        actions={<Link className="button button--secondary" href="/hr-admin/notification-events">Back to events</Link>}
        pills={["Routing updates", "Audience refinement", "Template linkage"]}
      />
      <NotificationEventForm
        initialValue={notificationEventToFormValue(itemResult.data)}
        mode="edit"
        options={optionsResult.data}
        itemId={itemId}
      />
    </main>
  );
}
