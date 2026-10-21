/** Authorized exact-pair existence reads; independent of the visible assignment page. */
export async function existingLeaveAssignmentPairs(pairs: Array<{ employeeId: string; policyId: string }>, signal: AbortSignal) {
  const unique = new Map(pairs.map(pair => [`${pair.employeeId}|${pair.policyId}`, pair]));
  if (unique.size > 250) throw new Error("Preview at most 250 distinct employee/policy pairs per batch.");
  const entries = [...unique.entries()];
  const existing = new Set<string>();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, async () => {
    while (next < entries.length) {
      const [key, pair] = entries[next++];
      const query = new URLSearchParams({ employee_id: pair.employeeId, leave_policy_id: pair.policyId, page_size: "1" });
      let response: Response;
      try {
        response = await fetch(`/api/hr-admin/leave-policy-assignments?${query}`, { cache: "no-store", signal });
      } catch (error) {
        if (signal.aborted) throw error;
        throw new Error("Existing assignments could not be checked. Check your connection and preview again before committing.");
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || !Number.isSafeInteger(payload?.total_count)) throw new Error("Existing assignments could not be checked. Preview again before committing.");
      if (payload.total_count > 0) existing.add(key);
    }
  }));
  return existing;
}

/** Reuse the backend's scope/date/priority policy. Existing identity alone is not a conflict. */
export async function previewLeaveAssignmentRows(rows: Array<import("@/lib/types").HrAdminLeavePolicyAssignmentWriteInput>, signal: AbortSignal) {
  if (rows.length > 250) throw new Error("Preview at most 250 assignment rows per batch.");
  const results: Array<{ blocked: boolean; message: string }> = new Array(rows.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next++;
      if (rows[index].is_active === false) { results[index] = { blocked: false, message: "Inactive assignment; final validation runs on commit." }; continue; }
      let response: Response;
      try {
        response = await fetch("/api/hr-admin/leave-policy-assignments/conflicts", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows[index]), cache: "no-store", signal,
        });
      } catch {
        throw new Error("Assignment conflicts could not be checked. Check your connection and preview again before committing.");
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.has_blocking_conflict !== "boolean" || typeof payload?.summary !== "string") throw new Error("Assignment conflicts could not be checked. Check your access and preview again before committing.");
      results[index] = { blocked: payload.has_blocking_conflict, message: payload.summary };
    }
  }));
  return results;
}
