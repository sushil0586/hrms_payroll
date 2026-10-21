import { test, expect } from "@playwright/test";
import { apiErrorMessage, apiFieldErrors, mutationErrorMessage, networkMutationMessage, unconfirmedMutationMessage } from "../../src/lib/ui/api-error-message";
import { leaveDecisionMessage } from "../../src/lib/ui/leave-decision-message";

test("nested serializer errors retain field names and multiple corrections", () => {
 const body = {config_snapshot: {approval: {auto_approve_after_hours: ["Enter a whole number."]}}, code: ["Already in use."]};
 expect(apiErrorMessage(body, "Fallback")).toBe("Approval · Automatic approval waiting hours: Enter a whole number. Code: Already in use.");
 expect(apiFieldErrors(body, ["code", "auto_approve_after_hours"], {"config_snapshot.approval.auto_approve_after_hours":"auto_approve_after_hours"})).toEqual({code: "Already in use.", auto_approve_after_hours: "Enter a whole number."});
});
test("form-level errors and conflict explanations retain their authoritative meaning", () => {
 expect(apiErrorMessage({non_field_errors: ["The periods overlap."]}, "Fallback")).toBe("The periods overlap.");
 expect(apiErrorMessage({detail: "Period is closed.", code: ["Other"]}, "Fallback")).toBe("Period is closed.");
 expect(apiErrorMessage({conflict_check: {summary: "Assignment overlaps."}}, "Fallback")).toBe("Assignment overlaps.");
});
test("nested row errors are readable and never become object Object", () => {
 expect(apiErrorMessage({rows: [{units: ["Must be positive."]}]}, "Fallback")).toBe("Rows · Row 1 · units: Must be positive.");
 expect(apiErrorMessage({detail: {reason: ["Explain the correction."]}}, "Fallback")).toBe("Reason: Explain the correction.");
 expect(apiFieldErrors({unknown: ["Hidden"]}, ["code"])).toEqual({});
 expect(apiFieldErrors({config_snapshot:{entitlement:{service_tiers:[{annual_entitlement:["Fix this tier."]}]}}},["annual_entitlement"])).toEqual({});
});
test("empty and malformed error bodies have an actionable safe fallback", () => {
 for (const body of [null, undefined, {}, [], 12, "<html>Error</html>"]) expect(apiErrorMessage(body, "Review the form and retry.")).toBe("Review the form and retry.");
});
test("unconfirmed mutations do not expose server internals or promise safe retries", () => {
 for (const status of [0, 500, 502, 503, 504]) expect(mutationErrorMessage({detail: "SECRET database trace"}, status, "Fallback")).toBe(unconfirmedMutationMessage);
 expect(networkMutationMessage).toContain("avoid submitting twice");
});
test("authentication permission conflict and throttling failures explain a next step", () => {
 expect(mutationErrorMessage({}, 401, "Fallback")).toContain("Sign in again");
 expect(mutationErrorMessage({}, 403, "Fallback")).toContain("permission");
 expect(mutationErrorMessage({detail: "Period locked."}, 403, "Fallback")).toBe("Period locked.");
 expect(mutationErrorMessage({}, 409, "Fallback")).toContain("Refresh and review");
 expect(mutationErrorMessage({}, 429, "Fallback")).toContain("Wait a moment");
});
test("intermediate approvals do not claim final approval", () => {
 expect(leaveDecisionMessage({status: "partially_approved"}, "approve")).toContain("awaiting the next approver");
 expect(leaveDecisionMessage({}, "approve")).toContain("remaining steps");
});
test("final approval rejection and cancellation confirmations are distinct", () => {
 expect(leaveDecisionMessage({status: "approved"}, "approve")).toBe("Leave request approved.");
 expect(leaveDecisionMessage({status: "approved"}, "approve", true)).toBe("Cancellation request approved.");
 expect(leaveDecisionMessage({status: "rejected"}, "reject", true)).toBe("Cancellation request rejected.");
});
