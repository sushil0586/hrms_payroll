/** Assemble bounded paginated evidence, or fail visibly rather than export a partial report. */
async function collectReport<P extends { items: { id: string }[]; total_count: number }>(
  load: (params: { page: number; page_size: number }) => Promise<{ data: P; state: "live" | "demo" }>,
) {
  const first = await load({ page: 1, page_size: 100 });
  const total = first.data.total_count;
  if (total > 10_000) throw new Error("This report exceeds the interactive limit. Use a governed reporting export.");
  const items = [...first.data.items];
  const ids = new Set(items.map(item => item.id));
  for (let page = 2; items.length < total; page++) {
    const next = await load({ page, page_size: 100 });
    if (next.state !== first.state || next.data.total_count !== total)
      throw new ReportPopulationChanged();
    if (!next.data.items.length) throw new Error("Report data is incomplete. Retry before exporting.");
    for (const item of next.data.items) {
      if (ids.has(item.id)) throw new Error("Report pages overlap. Retry before using this evidence.");
      ids.add(item.id); items.push(item);
    }
  }
  if (ids.size !== total || items.length !== total) throw new Error("Report data is incomplete. Retry before exporting.");
  return { ...first, data: { ...first.data, items } as P };
}

class ReportPopulationChanged extends Error {
  constructor() { super("Report data changed while loading. Retry for a consistent report."); }
}

export async function completeReport<P extends { items: {id: string}[]; total_count: number }>(
  load: (params: {page: number; page_size: number}) => Promise<{data: P; state: "live" | "demo"}>,
) {
  try { return await collectReport(load); }
  catch (error) {
    // Existing read projections may materialize current days. Restart once,
    // without waiting; persistent churn and all other source failures remain errors.
    if (!(error instanceof ReportPopulationChanged)) throw error;
    return collectReport(load);
  }
}
