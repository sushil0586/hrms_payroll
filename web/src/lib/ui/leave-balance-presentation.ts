import type { HrAdminLeaveBalance } from "@/lib/types";

// Factual read-model labels, not tenant risk policy or monetary valuation.
export function availableLeaveUnits(item: HrAdminLeaveBalance) {
  // The backend projection already deducts reservations from closing_balance.
  return Number(item.closing_balance);
}

export function leaveUtilizationPercent(item: HrAdminLeaveBalance) {
  const earned = Number(item.opening_balance) + Number(item.accrued_amount) + Number(item.carry_forward_amount) + Number(item.adjustment_amount);
  return earned ? Math.round(Number(item.consumed_amount) / earned * 100) : 0;
}

export function leaveBalanceState(item: HrAdminLeaveBalance) {
  if (availableLeaveUnits(item) < 0) return "Negative available";
  if (Number(item.reserved_amount) > 0) return "Reserved";
  return "No reservations";
}

// Retain the existing export column without asserting an unapproved risk rating.
export function leaveRiskAssessment() { return "Not assessed"; }
