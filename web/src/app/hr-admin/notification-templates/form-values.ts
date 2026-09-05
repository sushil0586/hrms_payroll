import type { HrAdminNotificationTemplate, HrAdminNotificationTemplateWriteInput } from "@/lib/types";

export function notificationTemplateToFormValue(item: HrAdminNotificationTemplate): HrAdminNotificationTemplateWriteInput {
  return {
    code: item.code,
    name: item.name,
    channel: item.channel,
    status: item.status,
    subject_template: item.subject_template,
    title_template: item.title_template,
    body_template: item.body_template,
    metadata_template: JSON.stringify(item.metadata_template ?? {}, null, 2),
    is_system_seeded: item.is_system_seeded,
  };
}

export function createEmptyNotificationTemplateValue(defaultChannel = "in_app", defaultStatus = "draft"): HrAdminNotificationTemplateWriteInput {
  return {
    code: "",
    name: "",
    channel: defaultChannel,
    status: defaultStatus,
    subject_template: "",
    title_template: "",
    body_template: "",
    metadata_template: "{}",
    is_system_seeded: false,
  };
}
