type ImportRequestResult = {
  ok: boolean;
  status: number;
  payload: Awaited<ReturnType<Response["json"]>>;
};

export async function submitImportRequest(input: RequestInfo | URL, init: RequestInit): Promise<ImportRequestResult> {
  try {
    const response = await fetch(input, init);
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return {
      ok: false,
      status: 0,
      payload: { detail: "Network request failed. Check your connection and retry the preserved rows." },
    };
  }
}
