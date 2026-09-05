import type { HrAdminLifecycleWorkItem, HrAdminOnboarding } from "@/lib/types";

type OnboardingReadinessItem = Pick<HrAdminOnboarding, "actual_joining_date" | "checklist_snapshot">;

function getChecklistEntries(item: OnboardingReadinessItem): HrAdminLifecycleWorkItem[] {
  return Array.isArray(item.checklist_snapshot) ? item.checklist_snapshot : [];
}

export function getOnboardingChecklistStats(item: OnboardingReadinessItem) {
  const checklist = getChecklistEntries(item);
  const totalCount = checklist.length;
  const openCount = checklist.filter((entry) => !entry.done).length;
  const completedCount = totalCount - openCount;
  return { totalCount, completedCount, openCount };
}

export function getOnboardingCompletionWarning(item: OnboardingReadinessItem) {
  const { openCount } = getOnboardingChecklistStats(item);
  const checklistWarning =
    openCount === 1
      ? "1 checklist item is still open."
      : `${openCount} checklist items are still open.`;
  if (!item.actual_joining_date && openCount > 0) {
    return `Actual joining date is missing and ${checklistWarning.charAt(0).toLowerCase()}${checklistWarning.slice(1)}`;
  }
  if (!item.actual_joining_date) {
    return "Actual joining date is missing.";
  }
  if (openCount > 0) {
    return checklistWarning;
  }
  return "";
}
