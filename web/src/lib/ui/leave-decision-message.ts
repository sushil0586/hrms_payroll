/** An approval step may only move a request to its next approver. */
export function leaveDecisionMessage(payload: { status?: unknown }, action: "approve" | "reject", cancellation = false) {
  const subject = cancellation ? "Cancellation request" : "Leave request";
  if (action === "reject") return `${subject} rejected.`;
  if (payload.status === "partially_approved") return "Approval step recorded. The request is awaiting the next approver.";
  if (payload.status === "approved") return `${subject} approved.`;
  return "Approval decision recorded. Check the current request status for any remaining steps.";
}
