import Link from "next/link";

import { createEmptyNotificationEventValue } from "@/app/hr-admin/notification-events/form-values";
import { NotificationEventForm } from "@/app/hr-admin/notification-events/notification-event-form";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminNotificationOptions } from "@/lib/api";

export default async function HrAdminNewNotificationEventPage() {
  const optionsResult = await getHrAdminNotificationOptions();

  return (
    <main className="shell">
      <PageIntro
        eyebrow={optionsResult.state === "live" ? "Live notification mode" : "Demo notification mode"}
        title="Create notification event"
        description="Define a trigger, audience, and delivery rule for notifications using the same modern form system as the rest of HR admin."
        actions={<Link className="button button--secondary" href="/hr-admin/notification-events">Back to events</Link>}
        pills={["Trigger setup", "Audience targeting", "Delivery control"]}
      />
      <NotificationEventForm
        initialValue={createEmptyNotificationEventValue(
          optionsResult.data.workflow_modules[0]?.value,
          optionsResult.data.notification_audience_types[0]?.value,
          optionsResult.data.notification_channels[0]?.value,
          optionsResult.data.notification_priorities[1]?.value || optionsResult.data.notification_priorities[0]?.value,
        )}
        mode="create"
        options={optionsResult.data}
      />
    </main>
  );
}
